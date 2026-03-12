// lib/transport/mock-provider.ts
import type { TransportProvider, TransportQuoteRequest, TransportQuoteResponse,
  TransportDispatchRequest, TransportDispatchResponse } from './types'
import centroids from './zip-centroids.json'

type ZipMap = Record<string, { lat: number; lng: number }>
const CENTROIDS = centroids as ZipMap

const FALLBACK_DISTANCE_MILES = 500
const RATE_PER_MILE = 0.60  // dollars
const MIN_FEE_CENTS = 15000  // $150.00

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export class MockTransportProvider implements TransportProvider {
  async getQuote(req: TransportQuoteRequest): Promise<TransportQuoteResponse> {
    const origin = CENTROIDS[req.pickup_zip]
    const dest   = CENTROIDS[req.delivery_zip]

    const distance_miles =
      origin && dest
        ? Math.round(haversineDistance(origin.lat, origin.lng, dest.lat, dest.lng))
        : FALLBACK_DISTANCE_MILES

    const fee_cents = Math.max(MIN_FEE_CENTS, Math.round(distance_miles * RATE_PER_MILE * 100))

    return { fee_cents, distance_miles }
  }

  async dispatch(req: TransportDispatchRequest): Promise<TransportDispatchResponse> {
    console.log('[transport/mock] Dispatching order', req.order_id)
    return {
      dispatch_id: `MOCK-${crypto.randomUUID()}`,
      status: 'dispatched',
    }
  }
}
