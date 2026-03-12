import { describe, it, expect } from 'vitest'
import { submitReviewSchema, submitSellerReplySchema } from '@/lib/validations/review'

// Zod v4 requires valid UUID version nibble (1-8); use v4-format UUIDs in tests
const VALID_ORDER_UUID  = '00000000-0000-4000-8000-000000000001'
const VALID_REVIEW_UUID = '00000000-0000-4000-8000-000000000002'

describe('submitReviewSchema', () => {
  it('accepts valid input', () => {
    const result = submitReviewSchema.safeParse({
      orderId: VALID_ORDER_UUID,
      rating: 4,
      body: 'Great seller!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects rating below 1', () => {
    const result = submitReviewSchema.safeParse({
      orderId: VALID_ORDER_UUID,
      rating: 0,
      body: 'Great seller!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects rating above 5', () => {
    const result = submitReviewSchema.safeParse({
      orderId: VALID_ORDER_UUID,
      rating: 6,
      body: 'Great seller!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty body', () => {
    const result = submitReviewSchema.safeParse({
      orderId: VALID_ORDER_UUID,
      rating: 3,
      body: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only body', () => {
    const result = submitReviewSchema.safeParse({
      orderId: VALID_ORDER_UUID,
      rating: 3,
      body: '   ',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-uuid orderId', () => {
    const result = submitReviewSchema.safeParse({
      orderId: 'not-a-uuid',
      rating: 3,
      body: 'Great seller!',
    })
    expect(result.success).toBe(false)
  })
})

describe('submitSellerReplySchema', () => {
  it('accepts valid reply', () => {
    const result = submitSellerReplySchema.safeParse({
      reviewId: VALID_REVIEW_UUID,
      body: 'Thank you for the kind words!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty body', () => {
    const result = submitSellerReplySchema.safeParse({
      reviewId: VALID_REVIEW_UUID,
      body: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only body', () => {
    const result = submitSellerReplySchema.safeParse({
      reviewId: VALID_REVIEW_UUID,
      body: '   ',
    })
    expect(result.success).toBe(false)
  })
})
