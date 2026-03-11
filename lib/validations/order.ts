import { z } from 'zod'

export const orderStatusEnum = z.enum([
  'pending_payment',
  'paid',
  'documents_sent',
  'documents_signed',
  'complete',
  'cancelled',
  'refunded',
])

export const documentStatusEnum = z.enum(['pending', 'sent', 'signed', 'voided'])

export const documentTypeEnum = z.enum(['purchase_agreement', 'title_transfer'])

/** Input schema for the createCheckoutSession Server Action */
export const checkoutSchema = z.object({
  listingId: z.string().uuid(),
})

/** Full order shape matching the orders table columns */
export const orderSchema = z.object({
  id:                       z.string().uuid(),
  listing_id:               z.string().uuid(),
  buyer_id:                 z.string().uuid(),
  seller_id:                z.string().uuid(),
  status:                   orderStatusEnum,
  price_cents:              z.number().int().positive(),
  stripe_payment_intent:    z.string().nullable(),
  stripe_checkout_session:  z.string().nullable(),
  created_at:               z.string().datetime(),
  updated_at:               z.string().datetime(),
})

export type OrderStatus       = z.infer<typeof orderStatusEnum>
export type DocumentStatus    = z.infer<typeof documentStatusEnum>
export type DocumentType      = z.infer<typeof documentTypeEnum>
export type CheckoutInput     = z.infer<typeof checkoutSchema>
export type Order             = z.infer<typeof orderSchema>
