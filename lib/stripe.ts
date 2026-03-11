import Stripe from 'stripe'

// NEVER import this file in client-side code.
// STRIPE_SECRET_KEY must NOT be prefixed with NEXT_PUBLIC_.
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set. This client is server-only.')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})
