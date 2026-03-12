import { z } from 'zod'

export const submitReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating:  z.number().int().min(1).max(5),
  body:    z.string().trim().min(1),
})

export const submitSellerReplySchema = z.object({
  reviewId: z.string().uuid(),
  body:     z.string().trim().min(1),
})

export const reviewSchema = z.object({
  id:           z.string().uuid(),
  order_id:     z.string().uuid(),
  buyer_id:     z.string().uuid(),
  seller_id:    z.string().uuid(),
  listing_id:   z.string().uuid(),
  rating:       z.number().int().min(1).max(5),
  body:         z.string(),
  seller_reply: z.string().nullable(),
  replied_at:   z.string().nullable(),
  created_at:   z.string(),
})

export type SubmitReviewInput      = z.infer<typeof submitReviewSchema>
export type SubmitSellerReplyInput = z.infer<typeof submitSellerReplySchema>
export type Review                 = z.infer<typeof reviewSchema>
