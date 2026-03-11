'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { checkoutSchema } from '@/lib/validations/order'

/**
 * Server Action: Create a Stripe Checkout Session for a listing purchase.
 * Redirects to Stripe Checkout on success, or to /login if unauthenticated.
 *
 * SECURITY: price_cents is read from the database — never trusted from the client.
 */
export async function createCheckoutSession(listingId: string) {
  // Validate input
  checkoutSchema.parse({ listingId })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch listing from DB — price comes from server, never client
  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, title, price_cents, status, seller_id')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()

  if (error || !listing) {
    throw new Error('Listing not available')
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: listing.price_cents,
          product_data: {
            name: listing.title ?? `${listing.year ?? ''} Vehicle`.trim(),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
    },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/listings/${listingId}`,
  })

  redirect(session.url!)
}
