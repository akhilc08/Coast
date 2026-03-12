// app/actions/transport.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getTransportProvider } from '@/lib/transport'
import { getTransportMarkupPct, applyMarkup } from '@/lib/transport-settings'

type QuoteSuccess = { fee_cents: number; distance_miles: number }
type QuoteTbd     = { tbd: true }

/**
 * Server action: get a transport quote for a listing + delivery ZIP.
 * Called from the TransportForm client component on ZIP blur.
 *
 * SECURITY: Requires authenticated session.
 * Returns { tbd: true } on any failure — never throws to the client.
 */
export async function getTransportQuoteAction(
  listingId: string,
  deliveryZip: string,
): Promise<QuoteSuccess | QuoteTbd> {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { tbd: true }

    // ZIP format validation
    if (!/^\d{5}$/.test(deliveryZip)) return { tbd: true }

    // Fetch listing pickup ZIP and vehicle details
    const { data: listing, error } = await supabase
      .from('listings')
      .select('pickup_zip, year, make, model')
      .eq('id', listingId)
      .single()

    if (error || !listing?.pickup_zip) return { tbd: true }

    const provider = getTransportProvider()
    const raw = await provider.getQuote({
      pickup_zip: listing.pickup_zip,
      delivery_zip: deliveryZip,
      vehicle: {
        year:  listing.year  ?? 0,
        make:  listing.make  ?? '',
        model: listing.model ?? '',
      },
    })

    const markupPct  = await getTransportMarkupPct()
    const fee_cents  = applyMarkup(raw.fee_cents, markupPct)

    return { fee_cents, distance_miles: raw.distance_miles }
  } catch {
    return { tbd: true }
  }
}
