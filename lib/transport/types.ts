// lib/transport/types.ts

export interface TransportQuoteRequest {
  pickup_zip: string
  delivery_zip: string
  vehicle: { year: number; make: string; model: string }
}

export interface TransportQuoteResponse {
  fee_cents: number
  distance_miles: number
  carrier?: string
  quote_id?: string
}

export interface TransportDispatchRequest {
  order_id: string
  pickup_zip: string
  delivery_address: string  // formatted: "{street}, {city}, {state} {zip}"
  delivery_zip: string
  vehicle: { year: number; make: string; model: string; vin: string }
  buyer_contact: { name: string; phone?: string; email: string }
}

export interface TransportDispatchResponse {
  dispatch_id: string
  status: 'dispatched'
  estimated_delivery_date?: string
}

export interface TransportProvider {
  getQuote(req: TransportQuoteRequest): Promise<TransportQuoteResponse>
  dispatch(req: TransportDispatchRequest): Promise<TransportDispatchResponse>
}
