// lib/transport/central-dispatch-provider.ts
// TODO: implement Central Dispatch API when credentials are available.
// Activate by setting TRANSPORT_PROVIDER=central_dispatch in environment.
// Required env vars: CENTRAL_DISPATCH_API_KEY, CENTRAL_DISPATCH_API_URL
// TODO: Central Dispatch status webhook handler — a future
//   /api/webhooks/central-dispatch route will handle status updates for
//   'in_transit' and 'delivered' transport_status transitions.

import type { TransportProvider, TransportQuoteRequest, TransportQuoteResponse,
  TransportDispatchRequest, TransportDispatchResponse } from './types'

export class CentralDispatchProvider implements TransportProvider {
  private readonly apiKey: string
  private readonly apiUrl: string

  constructor() {
    this.apiKey = process.env.CENTRAL_DISPATCH_API_KEY ?? ''
    this.apiUrl = process.env.CENTRAL_DISPATCH_API_URL ?? ''
  }

  // TODO: implement Central Dispatch API — getQuote endpoint
  async getQuote(_req: TransportQuoteRequest): Promise<TransportQuoteResponse> {
    throw new Error('Central Dispatch API not yet configured')
  }

  // TODO: implement Central Dispatch API — createOrder endpoint
  async dispatch(_req: TransportDispatchRequest): Promise<TransportDispatchResponse> {
    throw new Error('Central Dispatch API not yet configured')
  }
}
