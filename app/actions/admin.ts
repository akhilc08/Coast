'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createWholesalerSchema, type CreateWholesalerInput } from '@/lib/validations/admin'
import type { AiConditionData } from '@/lib/types/condition'
import { worstRatingToGrade } from '@/lib/types/condition'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.app_metadata?.role !== 'admin') throw new Error('Not authorized')
  return user
}

export async function createWholesalerAction(
  data: CreateWholesalerInput
): Promise<{ success: true; userId: string } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const result = createWholesalerSchema.safeParse(data)
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? 'Invalid input'
    return { error: firstError }
  }

  const { email, password, businessName } = result.data
  const admin = createAdminClient()

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'wholesaler' },
    user_metadata: { company: businessName },
  })

  if (error || !newUser.user) {
    return { error: error?.message ?? 'Failed to create user' }
  }

  // Backfill company into profiles (trigger only copies full_name)
  await admin.from('profiles').update({ company: businessName }).eq('id', newUser.user.id)

  return { success: true, userId: newUser.user.id }
}

export async function banUserAction(
  userId: string
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function adminSaveAiConditionAction(
  listingId: string,
  data: AiConditionData,
  pdfStorageKey: string
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const admin = createAdminClient()
  const ratings = [data.exterior.rating, data.interior.rating, data.mechanical.rating, data.tires.rating]
  const overallGrade = worstRatingToGrade(ratings)

  const { error } = await admin
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

  if (error) return { error: error.message }

  const { data: existing } = await admin
    .from('listing_documents')
    .select('id')
    .eq('listing_id', listingId)
    .eq('storage_key', pdfStorageKey)
    .maybeSingle()

  if (!existing) {
    await admin.from('listing_documents').insert({
      listing_id:    listingId,
      storage_key:   pdfStorageKey,
      document_type: 'inspection_report',
      file_name:     pdfStorageKey.split('/').pop() ?? 'inspection_report.pdf',
    })
  }

  return { success: true }
}

export async function unbanUserAction(
  userId: string
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function setSellerTierAction(
  userId: string,
  tier: 1 | 2
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ seller_tier: tier })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function adminUpdateListingAction(
  listingId: string,
  fields: {
    price_cents?: number
    make?: string
    model?: string
    year?: number
    mileage?: number
    color?: string
    condition_notes?: string
    pickup_zip?: string
  }
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const admin = createAdminClient()
  const title = fields.year && fields.make && fields.model
    ? `${fields.year} ${fields.make} ${fields.model}`
    : undefined

  const { error } = await admin
    .from('listings')
    .update({ ...fields, ...(title ? { title } : {}), updated_at: new Date().toISOString() })
    .eq('id', listingId)

  if (error) return { error: error.message }
  return { success: true }
}
