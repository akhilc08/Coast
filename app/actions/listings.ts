'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DetailsStepInput, ConditionStepInput } from '@/lib/validations/listing'
import type { VehicleDetails } from '@/lib/nhtsa'

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

  const title = fields.year && fields.make && fields.model
    ? `${fields.year} ${fields.make} ${fields.model}`
    : undefined

  const { error } = await supabase
    .from('listings')
    .update({ ...fields, ...(title ? { title } : {}), updated_at: new Date().toISOString() })
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
  const { data: listing } = await supabase
    .from('listings')
    .select('pickup_zip')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .single()

  if (!listing) return { error: 'Listing not found' }
  if (!listing.pickup_zip) return { error: 'Pickup ZIP code is required before publishing. Go back to Vehicle Details and add it.' }

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
