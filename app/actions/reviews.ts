'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { submitReviewSchema, submitSellerReplySchema } from '@/lib/validations/review'

export async function submitReview(
  orderId: string,
  rating: number,
  body: string
): Promise<{ success: true } | { error: string }> {
  // Validate inputs
  const parsed = submitReviewSchema.safeParse({ orderId, rating, body })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== 'consumer') return { error: 'Only buyers can leave reviews' }

  // Fetch the order (user-scoped client — RLS ensures buyer can only see their own orders)
  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, listing_id, status')
    .eq('id', orderId)
    .single()

  if (!order) return { error: 'Order not found' }
  if (order.status !== 'complete') return { error: 'Order is not complete' }

  // Check no existing review for this order
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .single()

  if (existing) return { error: 'Review already submitted for this order' }

  // Insert — RLS double-checks ownership and order status at DB level
  const { error: insertError } = await supabase.from('reviews').insert({
    order_id:   order.id,
    buyer_id:   order.buyer_id,
    seller_id:  order.seller_id,
    listing_id: order.listing_id,
    rating,
    body,
  })

  if (insertError) return { error: insertError.message }

  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath(`/sellers/${order.seller_id}`)
  revalidatePath(`/listings/${order.listing_id}`)

  return { success: true }
}

export async function submitSellerReply(
  reviewId: string,
  body: string
): Promise<{ success: true } | { error: string }> {
  // Validate inputs
  const parsed = submitSellerReplySchema.safeParse({ reviewId, body })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== 'wholesaler') return { error: 'Only sellers can reply to reviews' }

  // Fetch the review
  const { data: review } = await supabase
    .from('reviews')
    .select('id, seller_id, seller_reply')
    .eq('id', reviewId)
    .single()

  if (!review) return { error: 'Review not found' }
  if (review.seller_id !== user.id) return { error: 'Not your review' }
  if (review.seller_reply !== null) return { error: 'Reply already submitted' }

  // Update reply — RLS and column GRANT enforce this at DB level too
  const { error: updateError } = await supabase
    .from('reviews')
    .update({ seller_reply: body, replied_at: new Date().toISOString() })
    .eq('id', reviewId)

  if (updateError) return { error: updateError.message }

  // Revalidate seller profile only — reply doesn't affect aggregate stats
  revalidatePath(`/sellers/${user.id}`)

  return { success: true }
}
