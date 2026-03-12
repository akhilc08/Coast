// lib/transport/dispatch.ts
// Post-payment transport dispatch orchestrator.
// Called from lib/fulfillment.ts via Promise.allSettled — must never throw.
//
// NOTE on transport_quote_tbd orders: when the buyer accepted a TBD quote,
// we still dispatch (the car still needs to be transported). The TBD only
// means the transport fee was not charged in Stripe and will be billed
// out-of-band. The mock provider will always return 'dispatched' for these.

import { createAdminClient } from '@/lib/supabase/admin'
import { getTransportProvider } from '@/lib/transport'

/**
 * Dispatch a transport order to the configured transport provider.
 *
 * - On success: sets transport_dispatch_id and transport_status = 'dispatched'
 * - On failure: sets transport_status = 'failed', logs error — does NOT throw
 * - Skipped silently if order has no delivery_address (e.g., buyer picked up locally)
 *
 * Buyer email is fetched via auth.admin.getUserById (service role) because
 * email lives in auth.users, not profiles.
 */
export async function dispatchTransportOrder(orderId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, listing_id, buyer_id, delivery_address, delivery_zip')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error('[transport] Failed to fetch order for dispatch', orderId, orderError)
    return
  }

  // No delivery address means buyer arranged own pickup — skip dispatch
  if (!order.delivery_address || !order.delivery_zip) {
    console.log('[transport] No delivery address on order — skipping dispatch', orderId)
    return
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('year, make, model, vin, pickup_zip')
    .eq('id', order.listing_id)
    .single()

  if (listingError || !listing?.pickup_zip) {
    console.error('[transport] Listing missing pickup_zip for order', orderId)
    await supabase
      .from('orders')
      .update({ transport_status: 'failed' })
      .eq('id', orderId)
    return
  }

  // Buyer email lives in auth.users — use admin client
  const { data: authData } = await supabase.auth.admin.getUserById(order.buyer_id)
  const buyerEmail = authData?.user?.email ?? ''

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', order.buyer_id)
    .single()

  const buyerName = profile?.full_name ?? 'Buyer'

  // Mark as pending before calling provider
  const { error: pendingErr } = await supabase
    .from('orders')
    .update({ transport_status: 'pending' })
    .eq('id', orderId)
  if (pendingErr) console.error('[transport] Failed to set pending status for order', orderId, pendingErr)

  try {
    const provider = getTransportProvider()
    const result   = await provider.dispatch({
      order_id:         orderId,
      pickup_zip:       listing.pickup_zip,
      delivery_address: order.delivery_address,
      delivery_zip:     order.delivery_zip,
      vehicle: {
        year:  listing.year  ?? 0,
        make:  listing.make  ?? '',
        model: listing.model ?? '',
        vin:   listing.vin   ?? '',
      },
      buyer_contact: {
        name:  buyerName,
        phone: profile?.phone ?? undefined,
        email: buyerEmail,
      },
    })

    const { error: dispatchErr } = await supabase
      .from('orders')
      .update({
        transport_dispatch_id: result.dispatch_id,
        transport_status:      'dispatched',
      })
      .eq('id', orderId)
    if (dispatchErr) console.error('[transport] Failed to record dispatch for order', orderId, dispatchErr)

    console.log('[transport] Dispatched order', orderId, '→', result.dispatch_id)
  } catch (err) {
    console.error('[transport] Dispatch failed for order', orderId, err)
    const { error: failErr } = await supabase
      .from('orders')
      .update({ transport_status: 'failed' })
      .eq('id', orderId)
    if (failErr) console.error('[transport] Failed to record failure for order', orderId, failErr)
  }
}
