import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL, ADMIN_EMAIL } from '@/lib/resend'
import { OrderConfirmationEmail } from '@/lib/email/order-confirmation'
import { AdminOrderAlertEmail } from '@/lib/email/admin-order-alert'
import { render } from '@react-email/components'
import { after } from 'next/server'
import { generateAndSendDocuments } from '@/lib/fulfillment'

/**
 * Stripe webhook handler for checkout.session.completed.
 *
 * CRITICAL: Uses request.text() (not request.json()) to preserve the raw body
 * required for HMAC signature verification.
 *
 * Idempotent: duplicate events for the same stripe_checkout_session are ignored.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''

  let event: ReturnType<typeof stripe.webhooks.constructEvent>

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string
      amount_total: number | null
      payment_intent: string | null
      metadata: {
        listing_id: string
        buyer_id: string
        seller_id: string
        delivery_address?: string
        delivery_zip?: string
        transport_fee_cents?: string
        transport_quote_tbd?: string
      } | null
      customer_details: {
        email: string | null
        name: string | null
      } | null
    }

    const { listing_id, buyer_id, seller_id } = session.metadata ?? {}

    if (!listing_id || !buyer_id || !seller_id) {
      // Missing metadata — cannot process; return 200 to prevent Stripe retries
      return new Response('OK', { status: 200 })
    }

    const supabase = createAdminClient()

    // --- Idempotency check ---
    // If we've already processed this session, skip to prevent duplicate orders
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_checkout_session', session.id)
      .single()

    if (existingOrder) {
      return new Response('OK', { status: 200 })
    }

    // --- Mark listing as sold ---
    // The .eq('status', 'active') guard prevents double-sale race conditions
    await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing_id)
      .eq('status', 'active')

    // Fetch listing details for order record and emails (best-effort)
    const { data: listing } = await supabase
      .from('listings')
      .select('title, year, make, model, price_cents')
      .eq('id', listing_id)
      .single()

    // --- Create order record ---
    // Generate orderId client-side so we don't need a select() round-trip
    const orderId = crypto.randomUUID()
    const rawTransportFee = session.metadata?.transport_fee_cents
    const transportFeeCents =
      rawTransportFee && /^\d+$/.test(rawTransportFee) ? Number(rawTransportFee) : null
    await supabase
      .from('orders')
      .insert({
        id: orderId,
        listing_id,
        buyer_id,
        seller_id,
        status:                  'paid',
        price_cents:             session.amount_total ?? 0,
        vehicle_price_cents:     listing?.price_cents ?? null,
        stripe_payment_intent:   session.payment_intent ?? null,
        stripe_checkout_session: session.id,
        delivery_address:        session.metadata?.delivery_address ?? null,
        delivery_zip:            session.metadata?.delivery_zip ?? null,
        transport_fee_cents:     transportFeeCents,
        transport_quote_tbd:     session.metadata?.transport_quote_tbd === 'true',
        transport_status:        'pending',
      })

    // --- Create order_documents stubs ---
    await supabase.from('order_documents').insert([
      {
        order_id: orderId,
        document_type: 'purchase_agreement',
        status: 'pending',
      },
      {
        order_id: orderId,
        document_type: 'title_transfer',
        status: 'pending',
      },
    ])

    // --- Send transactional emails ---
    const orderNumber = orderId.slice(0, 8).toUpperCase()
    const buyerName = session.customer_details?.name ?? 'Valued Customer'
    const buyerEmail = session.customer_details?.email ?? ''

    const vehicleTitle =
      listing?.title ??
      [listing?.year, listing?.make, listing?.model].filter(Boolean).join(' ') ??
      'Vehicle'

    // Send NOTF-01 and NOTF-02 directly — they must complete within the webhook's 5-second window
    await Promise.allSettled([
      // NOTF-01: Buyer confirmation
      resend.emails.send({
        from: FROM_EMAIL,
        to: buyerEmail,
        subject: `Order Confirmed — ${vehicleTitle}`,
        html: await render(
          OrderConfirmationEmail({
            orderNumber,
            orderId,
            vehicleTitle,
            priceCents: session.amount_total ?? 0,
            buyerName,
          })
        ),
      }),
      // NOTF-02: Admin order alert
      resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `New Order: ${vehicleTitle} — ${orderNumber}`,
        html: await render(
          AdminOrderAlertEmail({
            orderNumber,
            vehicleTitle,
            priceCents: session.amount_total ?? 0,
            buyerName,
            buyerEmail,
          })
        ),
      }),
    ])

    // Trigger async document pipeline after webhook response is sent
    // after() ensures this runs within Vercel's extended execution window
    after(async () => {
      await generateAndSendDocuments(orderId)
    })
  }

  return new Response('OK', { status: 200 })
}
