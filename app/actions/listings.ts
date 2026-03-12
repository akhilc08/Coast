'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DetailsStepInput } from '@/lib/validations/listing'
import type { VehicleDetails } from '@/lib/nhtsa'

export async function createDraftAction(
  vin: string,
  vehicle?: VehicleDetails | null
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : vin

  const { data, error } = await supabase
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
  originalName: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('listing_documents').insert({
    listing_id: listingId,
    storage_key: storageKey,
    document_type: documentType,
    original_name: originalName,
  })

  if (error) return { error: error.message }
  return { success: true }
}
