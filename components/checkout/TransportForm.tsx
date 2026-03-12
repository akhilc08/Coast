// components/checkout/TransportForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { getTransportQuoteAction } from '@/app/actions/transport'
import { proceedToCheckout } from '@/app/actions/checkout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TransportFormProps {
  listingId:    string
  vehicleTitle: string
  priceCents:   number
  heroUrl:      string | null
}

type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; fee_cents: number; distance_miles: number }
  | { status: 'tbd' }

export function TransportForm({ listingId, vehicleTitle, priceCents, heroUrl }: TransportFormProps) {
  const [quote, setQuote]           = useState<QuoteState>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()
  const [street, setStreet]         = useState('')
  const [city,   setCity]           = useState('')
  const [state,  setState]          = useState('')
  const [zip,    setZip]            = useState('')

  function handleZipBlur() {
    if (!/^\d{5}$/.test(zip)) return
    if (isPending) return  // Prevent concurrent quote fetches
    setQuote({ status: 'loading' })
    startTransition(async () => {
      const result = await getTransportQuoteAction(listingId, zip)
      if ('tbd' in result) {
        setQuote({ status: 'tbd' })
      } else {
        setQuote({ status: 'success', fee_cents: result.fee_cents, distance_miles: result.distance_miles })
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await proceedToCheckout(listingId, { street, city, state, zip })
    })
  }

  const showBreakdown = quote.status === 'success' || quote.status === 'tbd'
  const totalCents    = quote.status === 'success' ? priceCents + quote.fee_cents : priceCents

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1c1917]">Delivery Details</h1>
        <p className="mt-1 text-sm text-[#78716c]">
          Enter your delivery address to get a transport quote before completing your purchase.
        </p>
      </div>

      {/* Vehicle summary card */}
      <div className="flex items-center gap-4 rounded-xl border border-[#e7e5e4] bg-white p-4">
        {heroUrl && (
          <img
            src={heroUrl}
            alt={vehicleTitle}
            className="h-16 w-24 flex-shrink-0 rounded-lg object-cover"
          />
        )}
        <div>
          <p className="font-semibold text-[#1c1917]">{vehicleTitle}</p>
          <p className="mt-0.5 text-sm text-[#78716c]">
            ${(priceCents / 100).toLocaleString('en-US')}
          </p>
        </div>
      </div>

      {/* Address form */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[#e7e5e4] bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[#a8a29e]">
          Delivery Address
        </p>

        <div>
          <label className="mb-1 block text-sm text-[#78716c]">Street Address *</label>
          <Input
            value={street}
            onChange={e => setStreet(e.target.value)}
            placeholder="123 Main St"
            className="border-[#e7e5e4] bg-white text-[#1c1917]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-[#78716c]">City *</label>
            <Input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Austin"
              className="border-[#e7e5e4] bg-white text-[#1c1917]"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#78716c]">State *</label>
            <Input
              value={state}
              onChange={e => setState(e.target.value.toUpperCase())}
              placeholder="TX"
              maxLength={2}
              className="border-[#e7e5e4] bg-white text-[#1c1917]"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-[#78716c]">ZIP Code *</label>
          <Input
            value={zip}
            onChange={e => setZip(e.target.value)}
            onBlur={handleZipBlur}
            placeholder="78701"
            maxLength={5}
            inputMode="numeric"
            pattern="\d{5}"
            className="border-[#e7e5e4] bg-white text-[#1c1917]"
            required
          />
        </div>

        {/* Quote loading state */}
        {quote.status === 'loading' && (
          <p className="text-sm text-[#78716c]">Getting transport quote…</p>
        )}

        {/* TBD banner */}
        {quote.status === 'tbd' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-800">Transport fee — TBD</p>
            <p className="mt-1 text-sm text-amber-700">
              We could not calculate an exact quote. You can still proceed — our team will contact
              you to confirm transport pricing after purchase.
            </p>
          </div>
        )}

        {/* Price breakdown */}
        {showBreakdown && (
          <div className="rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-4 py-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[#a8a29e]">
              Order Summary
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-[#78716c]">Vehicle</span>
              <span className="text-[#1c1917]">${(priceCents / 100).toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#78716c]">
                Transport
                {quote.status === 'success' && quote.distance_miles > 0
                  ? ` (~${quote.distance_miles.toLocaleString('en-US')} mi)`
                  : ''}
              </span>
              <span className="text-[#1c1917]">
                {quote.status === 'success'
                  ? `$${(quote.fee_cents / 100).toLocaleString('en-US')}`
                  : 'TBD'}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#e7e5e4] pt-2 font-semibold">
              <span className="text-[#1c1917]">Total</span>
              <span className="text-[#1c1917]">
                ${(totalCents / 100).toLocaleString('en-US')}
                {quote.status === 'tbd' ? ' + transport' : ''}
              </span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending || !street || !city || !state || !zip}
          className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {isPending ? 'Processing…' : 'Continue to Payment'}
        </Button>
      </form>
    </div>
  )
}
