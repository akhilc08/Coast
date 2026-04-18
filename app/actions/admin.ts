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

export async function approveListingAction(
  listingId: string
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('seller_id, status, condition_locked')
    .eq('id', listingId)
    .single()

  if (!listing) return { error: 'Listing not found' }
  if (!listing.condition_locked) return { error: 'Cannot approve without a locked condition report' }

  const { error } = await admin
    .from('listings')
    .update({ status: 'active', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', listingId)

  if (error) return { error: error.message }

  // Notify the seller
  if (listing.seller_id) {
    await admin.from('notifications').insert({
      user_id: listing.seller_id,
      title: 'Listing Approved',
      body: 'Your listing has been inspected and approved. It is now live on the marketplace.',
      link: '/seller/dashboard',
    })

    // Also send email notification
    try {
      const { getResend, FROM_EMAIL } = await import('@/lib/resend')
      const { data: profile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', listing.seller_id)
        .single()

      // Get seller email from auth
      const { data: authUser } = await admin.auth.admin.getUserById(listing.seller_id)
      const email = authUser?.user?.email
      if (email) {
        await getResend().emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: 'Your listing has been approved on Coast',
          html: `<p>Great news! Your listing has been inspected and approved. It is now live on the Coast marketplace.</p><p><a href="${process.env.NEXT_PUBLIC_URL}/seller/dashboard">View your dashboard</a></p>`,
        })
      }
    } catch {
      // Email failure shouldn't block the approval
    }
  }

  return { success: true }
}

export async function promoteSellerTierAction(
  userId: string,
  tier: 'beginner' | 'trusted'
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

export async function cancelOrderWithPenaltyAction(
  orderId: string
): Promise<{ success: true; penaltyBreakdown: { total: number; buyerCredit: number; coastFee: number } } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, price_cents, seller_id, buyer_id, status')
    .eq('id', orderId)
    .single()

  if (!order) return { error: 'Order not found' }
  if (order.status === 'cancelled') return { error: 'Order already cancelled' }

  const priceCents = order.price_cents as number
  const totalPenalty = Math.round(priceCents * 0.10)
  const buyerCredit = Math.round(priceCents * 0.05)
  const coastFee = totalPenalty - buyerCredit

  const { error } = await admin
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) return { error: error.message }

  // Notify buyer
  if (order.buyer_id) {
    await admin.from('notifications').insert({
      user_id: order.buyer_id as string,
      title: 'Order Cancelled by Seller',
      body: `The seller has cancelled your order. You will receive a credit of $${(buyerCredit / 100).toFixed(2)}.`,
      link: '/account/orders',
    })
  }

  return {
    success: true,
    penaltyBreakdown: {
      total: totalPenalty,
      buyerCredit,
      coastFee,
    },
  }
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
