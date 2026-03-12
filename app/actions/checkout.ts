'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { checkoutSchema } from '@/lib/validations/order'
import { getTransportProvider } from '@/lib/transport'
import { getTransportMarkupPct, applyMarkup } from '@/lib/transport-settings'

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
            name: listing.title ?? 'Vehicle',
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

/**
 * Server Action: Collect delivery address, derive transport quote server-side,
 * and create a Stripe Checkout Session with transport as a line item.
 *
 * Called from TransportForm (client component) via useTransition.
 *
 * SECURITY:
 * - price_cents fetched from DB — never trusted from client
 * - transport_fee_cents re-derived server-side — never trusted from client
 */
export async function proceedToCheckout(
  listingId: string,
  data: { street: string; city: string; state: string; zip: string }
) {
  const { street, city, state, zip } = data

  // Input validation
  if (!street?.trim() || !city?.trim() || !state?.trim()) {
    throw new Error('All address fields are required')
  }
  if (!/^\d{5}$/.test(zip)) {
    throw new Error('Invalid ZIP code')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // SECURITY: fetch listing from DB — price and pickup_zip come from server only
  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, title, price_cents, status, seller_id, pickup_zip, year, make, model')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()

  if (error || !listing) throw new Error('Listing not available')

  // SECURITY: re-derive transport fee server-side — never trust client-supplied value
  let transport_fee_cents: number | null = null
  let transport_quote_tbd = false

  if (listing.pickup_zip) {
    try {
      const provider   = getTransportProvider()
      const markupPct  = await getTransportMarkupPct()
      const raw        = await provider.getQuote({
        pickup_zip:   listing.pickup_zip,
        delivery_zip: zip,
        vehicle: {
          year:  listing.year  ?? 0,
          make:  listing.make  ?? '',
          model: listing.model ?? '',
        },
      })
      transport_fee_cents = applyMarkup(raw.fee_cents, markupPct)
    } catch {
      transport_quote_tbd = true
    }
  } else {
    transport_quote_tbd = true
  }

  const delivery_address = `${street.trim()}, ${city.trim()}, ${state.trim().toUpperCase()} ${zip}`

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'usd',
        unit_amount: listing.price_cents,
        product_data: { name: listing.title ?? 'Vehicle' },
      },
      quantity: 1,
    },
  ]

  // Only add transport line item when fee is known (not TBD)
  if (transport_fee_cents && !transport_quote_tbd) {
    line_items.push({
      price_data: {
        currency: 'usd',
        unit_amount: transport_fee_cents,
        product_data: { name: 'Vehicle Transport — door-to-door delivery' },
      },
      quantity: 1,
    })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    metadata: {
      listing_id:           listing.id,
      buyer_id:             user.id,
      seller_id:            listing.seller_id,
      delivery_address,
      delivery_zip:         zip,
      transport_fee_cents:  transport_fee_cents ? String(transport_fee_cents) : '',
      transport_quote_tbd:  transport_quote_tbd ? 'true' : 'false',
    },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${baseUrl}/listings/${listingId}`,
  })

  redirect(session.url!)
}
