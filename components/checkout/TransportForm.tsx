// components/checkout/TransportForm.tsx
'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
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

interface NominatimResult {
  place_id: number
  display_name: string
  address: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    county?: string
    'ISO3166-2-lvl4'?: string
    postcode?: string
  }
}

export function TransportForm({ listingId, vehicleTitle, priceCents, heroUrl }: TransportFormProps) {
  const [quote, setQuote]           = useState<QuoteState>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()
  const [street, setStreet]         = useState('')
  const [city,   setCity]           = useState('')
  const [state,  setState]          = useState('')
  const [zip,    setZip]            = useState('')

  const [suggestions, setSuggestions]       = useState<NominatimResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function fetchQuote(zipCode: string) {
    if (!/^\d{5}$/.test(zipCode) || isPending) return
    setQuote({ status: 'loading' })
    startTransition(async () => {
      const result = await getTransportQuoteAction(listingId, zipCode)
      if ('tbd' in result) {
        setQuote({ status: 'tbd' })
      } else {
        setQuote({ status: 'success', fee_cents: result.fee_cents, distance_miles: result.distance_miles })
      }
    })
  }

  function handleZipBlur() {
    fetchQuote(zip)
  }

  function handleStreetChange(value: string) {
    setStreet(value)
    setActiveSuggestion(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 4) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          format: 'json',
          addressdetails: '1',
          countrycodes: 'us',
          limit: '6',
          q: value,
        })
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { 'Accept-Language': 'en' },
        })
        const data: NominatimResult[] = await res.json()
        // Only show results that have a road component (actual addresses)
        const filtered = data.filter(r => r.address.road)
        setSuggestions(filtered)
        setShowSuggestions(filtered.length > 0)
      } catch {
        // silently fail — user can still type manually
      }
    }, 400)
  }

  function selectSuggestion(result: NominatimResult) {
    const addr = result.address
    const streetStr = [addr.house_number, addr.road].filter(Boolean).join(' ')
    const cityStr   = addr.city ?? addr.town ?? addr.village ?? addr.county ?? ''
    const isoState  = addr['ISO3166-2-lvl4'] ?? ''
    const stateStr  = isoState.split('-').pop()?.toUpperCase() ?? ''
    const zipStr    = (addr.postcode ?? '').slice(0, 5)

    setStreet(streetStr)
    setCity(cityStr)
    setState(stateStr)
    setZip(zipStr)
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestion(-1)

    fetchQuote(zipStr)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[activeSuggestion])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
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

        {/* Street with autocomplete */}
        <div ref={containerRef} className="relative">
          <label className="mb-1 block text-sm text-[#78716c]">Street Address *</label>
          <Input
            value={street}
            onChange={e => handleStreetChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="123 Main St"
            className="border-[#e7e5e4] bg-white text-[#1c1917]"
            autoComplete="off"
            required
          />
          {showSuggestions && (
            <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-[#e7e5e4] bg-white shadow-lg">
              {suggestions.map((result, i) => (
                <li
                  key={result.place_id}
                  onMouseDown={() => selectSuggestion(result)}
                  className={`cursor-pointer px-3 py-2.5 text-sm transition-colors ${
                    i === activeSuggestion
                      ? 'bg-[#f5f5f4] text-[#1c1917]'
                      : 'text-[#44403c] hover:bg-[#faf9f6]'
                  } ${i < suggestions.length - 1 ? 'border-b border-[#f5f5f4]' : ''}`}
                >
                  <span className="block font-medium leading-tight">
                    {[result.address.house_number, result.address.road].filter(Boolean).join(' ')}
                  </span>
                  <span className="block text-xs text-[#a8a29e]">
                    {result.address.city ?? result.address.town ?? result.address.village ?? ''}
                    {result.address['ISO3166-2-lvl4']
                      ? `, ${result.address['ISO3166-2-lvl4'].split('-').pop()}`
                      : ''}
                    {result.address.postcode ? ` ${result.address.postcode.slice(0, 5)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
