'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DetailsStepInput, ConditionStepInput } from '@/lib/validations/listing'
import type { VehicleDetails } from '@/lib/nhtsa'
import type { AiConditionData } from '@/lib/types/condition'
import { worstRatingToGrade } from '@/lib/types/condition'

export async function createDraftAction(
  vin: string,
  vehicle?: VehicleDetails | null
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const title = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : vin

  const { data, error } = await admin
    .from('listings')
    .insert({
      seller_id:   user.id,
      vin,
      status:      'draft',
      title,
      price_cents: 0,
      make:        vehicle?.make  ?? '',
      model:       vehicle?.model ?? '',
      year:        vehicle?.year  ?? new Date().getFullYear(),
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/seller/dashboard')
  return { id: data.id }
}

export async function updateListingAction(
  listingId: string,
  fields: Partial<DetailsStepInput>
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // If listing is pending inspection, strip critical locked fields
  const { data: currentListing } = await supabase
    .from('listings')
    .select('status')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .single()

  let allowedFields = { ...fields }
  if (currentListing?.status === 'pending_inspection') {
    const { price_cents, make, model, year, ...rest } = allowedFields
    void price_cents; void make; void model; void year
    allowedFields = rest
  }

  const title = allowedFields.year && allowedFields.make && allowedFields.model
    ? `${allowedFields.year} ${allowedFields.make} ${allowedFields.model}`
    : undefined

  const { error } = await supabase
    .from('listings')
    .update({ ...allowedFields, ...(title ? { title } : {}), updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function publishListingAction(
  listingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Guard: pickup_zip must be set before publishing
  const [{ data: listing }, { data: profile }] = await Promise.all([
    supabase
      .from('listings')
      .select('pickup_zip, condition_locked')
      .eq('id', listingId)
      .eq('seller_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('seller_tier')
      .eq('id', user.id)
      .single(),
  ])

  if (!listing) return { error: 'Listing not found' }
  if (!listing.pickup_zip) return { error: 'Pickup ZIP code is required before publishing. Go back to Vehicle Details and add it.' }

  const tier = profile?.seller_tier ?? 1
  if (tier >= 2 && !listing.condition_locked) {
    return { error: 'An inspection report must be attached before publishing. Please upload one in the Condition step.' }
  }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'active', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/seller/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function archiveListingAction(
  listingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/seller/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function upsertPhotoPositionsAction(
  positions: { id: string; position: number }[]
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('listing_photos')
    .upsert(positions, { onConflict: 'id' })

  if (error) return { error: error.message }
  return { success: true }
}

export async function deletePhotoAction(
  photoId: string,
  storageKey: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: photo } = await supabase
    .from('listing_photos')
    .select('listing_id, listings!inner(seller_id)')
    .eq('id', photoId)
    .single()

  if (!photo) return { error: 'Photo not found' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  await admin.storage.from('car-photos').remove([storageKey])

  const { error } = await supabase.from('listing_photos').delete().eq('id', photoId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function addDocumentAction(
  listingId: string,
  storageKey: string,
  documentType: string,
  fileName: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .single()

  if (!listing) return { error: 'Listing not found or access denied' }

  const { error } = await supabase.from('listing_documents').insert({
    listing_id:    listingId,
    storage_key:   storageKey,
    document_type: documentType,
    file_name:     fileName,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function saveAiConditionAction(
  listingId:  string,
  data:       AiConditionData,
  pdfStorageKey: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const ratings = [
    data.exterior.rating,
    data.interior.rating,
    data.mechanical.rating,
    data.tires.rating,
  ]
  const overallGrade = worstRatingToGrade(ratings)

  const { error } = await supabase
    .from('listings')
    .update({
      ai_condition_exterior:   data.exterior,
      ai_condition_interior:   data.interior,
      ai_condition_mechanical: data.mechanical,
      ai_condition_tires:      data.tires,
      condition_locked:        true,
      condition_pdf_key:       pdfStorageKey,
      overall_grade:           overallGrade,
      updated_at:              new Date().toISOString(),
    })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }

  // Register the PDF as a listing document (only if not already recorded)
  const { data: existing } = await supabase
    .from('listing_documents')
    .select('id')
    .eq('listing_id', listingId)
    .eq('storage_key', pdfStorageKey)
    .maybeSingle()

  if (!existing) {
    await supabase.from('listing_documents').insert({
      listing_id:    listingId,
      storage_key:   pdfStorageKey,
      document_type: 'inspection_report',
      file_name:     'Inspection Report',
    })
  }

  return { success: true }
}

export async function pauseListingAction(
  listingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/seller/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function unpauseListingAction(
  listingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/seller/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function deleteListingAction(
  listingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/seller/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function submitForInspectionAction(
  listingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: listing } = await supabase
    .from('listings')
    .select('pickup_zip')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .single()

  if (!listing) return { error: 'Listing not found' }
  if (!listing.pickup_zip) return { error: 'Pickup ZIP is required before submitting for inspection.' }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'pending_inspection', updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/seller/dashboard')
  return { success: true }
}

export async function adminApproveListingAction(
  listingId: string
): Promise<{ success: true } | { error: string }> {
  // Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') return { error: 'Not authorized' }

  const { createAdminClient: mkAdmin } = await import('@/lib/supabase/admin')
  const admin = mkAdmin()

  const { data: listing } = await admin
    .from('listings')
    .select('id, year, make, model, status, condition_locked, profiles!seller_id(email, full_name)')
    .eq('id', listingId)
    .single()

  if (!listing) return { error: 'Listing not found' }
  if (!listing.condition_locked) {
    return { error: 'Cannot approve: no inspection report has been attached to this listing.' }
  }

  const { error } = await admin
    .from('listings')
    .update({
      status: 'active',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)

  if (error) return { error: error.message }

  // Email seller — non-fatal if it fails
  const sellerProfile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles
  if (sellerProfile?.email) {
    const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'https://drivewithcoast.com'
    const { resend, FROM_EMAIL } = await import('@/lib/resend')
    await resend.emails.send({
      from: FROM_EMAIL,
      to: sellerProfile.email,
      subject: `Your listing is live: ${listing.year} ${listing.make} ${listing.model}`,
      html: `<p>Hi ${sellerProfile.full_name ?? 'there'},</p><p>Your <strong>${listing.year} ${listing.make} ${listing.model}</strong> has been inspected, approved, and is now live on Coast. Buyers can find and purchase it now.</p><p><a href="${baseUrl}/listings/${listing.id}">View your listing →</a></p><p>— The Coast Team</p>`,
    }).catch(() => {/* non-fatal */})
  }

  revalidatePath('/seller/dashboard')
  revalidatePath('/')
  revalidatePath(`/admin/listings/${listingId}`)
  return { success: true }
}

export async function updateConditionAction(
  listingId: string,
  data: ConditionStepInput
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('listings')
    .update({
      overall_grade:          data.overall_grade,
      overall_notes:          data.overall_notes ?? null,
      paint_condition:        data.paint_condition,
      body_condition:         data.body_condition,
      glass_condition:        data.glass_condition ?? null,
      exterior_notes:         data.exterior_notes ?? null,
      seat_condition:         data.seat_condition,
      dashboard_condition:    data.dashboard_condition ?? null,
      carpet_condition:       data.carpet_condition ?? null,
      interior_notes:         data.interior_notes ?? null,
      engine_condition:       data.engine_condition,
      transmission_condition: data.transmission_condition ?? null,
      brake_condition:        data.brake_condition ?? null,
      tire_condition:         data.tire_condition ?? null,
      tire_tread_depth:       data.tire_tread_depth ?? null,
      mechanical_notes:       data.mechanical_notes ?? null,
      known_issues:           data.known_issues,
      has_accident_history:   data.has_accident_history,
      has_flood_damage:       data.has_flood_damage,
      has_frame_damage:       data.has_frame_damage,
      has_rebuilt_title:      data.has_rebuilt_title,
      has_lien:               data.has_lien,
      is_former_rental:       data.is_former_rental,
      updated_at:             new Date().toISOString(),
    })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
