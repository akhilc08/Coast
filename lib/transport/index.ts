// lib/transport/index.ts
import { MockTransportProvider } from './mock-provider'
import { CentralDispatchProvider } from './central-dispatch-provider'
import type { TransportProvider } from './types'

export function getTransportProvider(): TransportProvider {
  if (process.env.TRANSPORT_PROVIDER === 'central_dispatch') {
    return new CentralDispatchProvider()
  }
  return new MockTransportProvider()
}

export type { TransportProvider, TransportQuoteRequest, TransportQuoteResponse,
  TransportDispatchRequest, TransportDispatchResponse } from './types'
