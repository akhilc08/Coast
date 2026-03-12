# Transport Service Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Central Dispatch car transport service to Coast so buyers can receive purchased vehicles at their door, with a transport fee quoted before payment and included as a Stripe line item.

**Architecture:** Service abstraction layer in `lib/transport/` with a `TransportProvider` interface — mock implementation now, real Central Dispatch swapped in via env var later. Transport fee collected pre-checkout on a new `/checkout/[listingId]/transport` page, passed through Stripe metadata, and dispatched automatically post-payment via `lib/fulfillment.ts`.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + admin client), Stripe Checkout, TypeScript, Tailwind CSS, shadcn/ui

---

## Chunk 1: Database Migrations + Transport Service Layer

### Task 1: Database Migrations

**Files:**
- Create: `supabase/migrations/009_listings_pickup_zip.sql`
- Create: `supabase/migrations/010_orders_transport_fields.sql`
- Create: `supabase/migrations/011_app_settings.sql`

- [ ] **Step 1: Write migration 009 — add pickup_zip to listings**

```sql
-- supabase/migrations/009_listings_pickup_zip.sql
-- Add nullable pickup_zip to listings.
-- pickup_zip is collected in wizard Step 2 (not at draft creation).
-- publishListingAction enforces it is set before going active.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pickup_zip TEXT;
```

- [ ] **Step 2: Write migration 010 — add transport fields to orders**

```sql
-- supabase/migrations/010_orders_transport_fields.sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_zip TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS transport_fee_cents INTEGER,
  ADD COLUMN IF NOT EXISTS transport_quote_tbd BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transport_status TEXT NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS transport_dispatch_id TEXT;
```

- [ ] **Step 3: Write migration 011 — app_settings table**

```sql
-- supabase/migrations/011_app_settings.sql
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Admin can read and write; all server reads use the admin client (bypasses RLS)
CREATE POLICY "Admin full access" ON app_settings
  FOR ALL TO authenticated
  USING  (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

INSERT INTO app_settings (key, value)
VALUES ('transport_markup_pct', '0')
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 4: Apply migrations**

```bash
npx supabase db push
```

Expected: three migrations applied successfully with no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/009_listings_pickup_zip.sql \
        supabase/migrations/010_orders_transport_fields.sql \
        supabase/migrations/011_app_settings.sql
git commit -m "feat: add transport-related DB migrations (009-011)"
```

---

### Task 2: Transport Types and Provider Interface

**Files:**
- Create: `lib/transport/types.ts`
- Create: `lib/transport/index.ts`

- [ ] **Step 1: Write types.ts**

```typescript
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
```

- [ ] **Step 2: Write index.ts — provider factory**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add lib/transport/types.ts lib/transport/index.ts
git commit -m "feat: add transport provider interface and factory"
```

---

### Task 3: ZIP Centroids Data + Mock Provider

**Files:**
- Create: `lib/transport/zip-centroids.json`
- Create: `lib/transport/mock-provider.ts`

- [ ] **Step 1: Write zip-centroids.json**

This file maps US ZIP codes to lat/lng centroids. The mock provider uses haversine distance between ZIPs to estimate transport distance. Unknown ZIPs fall back to 500 miles.

```json
{
  "10001": { "lat": 40.7484, "lng": -73.9967 },
  "10601": { "lat": 41.0340, "lng": -73.7629 },
  "02101": { "lat": 42.3601, "lng": -71.0589 },
  "02901": { "lat": 41.8240, "lng": -71.4128 },
  "03101": { "lat": 42.9956, "lng": -71.4548 },
  "04101": { "lat": 43.6591, "lng": -70.2568 },
  "05401": { "lat": 44.4759, "lng": -73.2121 },
  "06101": { "lat": 41.7658, "lng": -72.6851 },
  "07101": { "lat": 40.7357, "lng": -74.1724 },
  "10301": { "lat": 40.6301, "lng": -74.0940 },
  "11201": { "lat": 40.6928, "lng": -73.9903 },
  "17101": { "lat": 40.2732, "lng": -76.8867 },
  "19101": { "lat": 39.9526, "lng": -75.1652 },
  "19801": { "lat": 39.7447, "lng": -75.5484 },
  "20001": { "lat": 38.9072, "lng": -77.0369 },
  "21201": { "lat": 39.2904, "lng": -76.6122 },
  "21401": { "lat": 38.9784, "lng": -76.4922 },
  "23219": { "lat": 37.5407, "lng": -77.4360 },
  "27601": { "lat": 35.7796, "lng": -78.6382 },
  "28201": { "lat": 35.2271, "lng": -80.8431 },
  "29401": { "lat": 32.7765, "lng": -79.9311 },
  "30301": { "lat": 33.7490, "lng": -84.3880 },
  "32801": { "lat": 28.5383, "lng": -81.3792 },
  "33101": { "lat": 25.7617, "lng": -80.1918 },
  "35203": { "lat": 33.5186, "lng": -86.8104 },
  "36104": { "lat": 32.3668, "lng": -86.3000 },
  "37201": { "lat": 36.1627, "lng": -86.7816 },
  "38101": { "lat": 35.1495, "lng": -90.0490 },
  "39201": { "lat": 32.2988, "lng": -90.1848 },
  "40201": { "lat": 38.2527, "lng": -85.7585 },
  "43201": { "lat": 39.9612, "lng": -82.9988 },
  "44101": { "lat": 41.4993, "lng": -81.6944 },
  "45201": { "lat": 39.1031, "lng": -84.5120 },
  "46201": { "lat": 39.7684, "lng": -86.1581 },
  "48201": { "lat": 42.3314, "lng": -83.0458 },
  "49503": { "lat": 42.9634, "lng": -85.6681 },
  "53201": { "lat": 43.0389, "lng": -87.9065 },
  "55401": { "lat": 44.9778, "lng": -93.2650 },
  "60601": { "lat": 41.8858, "lng": -87.6181 },
  "61602": { "lat": 40.6936, "lng": -89.5890 },
  "63101": { "lat": 38.6270, "lng": -90.1994 },
  "64101": { "lat": 39.0997, "lng": -94.5786 },
  "66101": { "lat": 39.1155, "lng": -94.6268 },
  "68101": { "lat": 41.2565, "lng": -95.9345 },
  "70112": { "lat": 29.9511, "lng": -90.0715 },
  "73101": { "lat": 35.4676, "lng": -97.5164 },
  "75201": { "lat": 32.7767, "lng": -96.7970 },
  "77001": { "lat": 29.7543, "lng": -95.3677 },
  "78201": { "lat": 29.4241, "lng": -98.4936 },
  "78701": { "lat": 30.2672, "lng": -97.7431 },
  "80201": { "lat": 39.7392, "lng": -104.9903 },
  "84101": { "lat": 40.7608, "lng": -111.8910 },
  "85001": { "lat": 33.4484, "lng": -112.0740 },
  "85701": { "lat": 32.2226, "lng": -110.9747 },
  "87101": { "lat": 35.0853, "lng": -106.6056 },
  "89101": { "lat": 36.1699, "lng": -115.1398 },
  "90001": { "lat": 34.0522, "lng": -118.2437 },
  "90210": { "lat": 34.0901, "lng": -118.4065 },
  "92101": { "lat": 32.7157, "lng": -117.1611 },
  "94101": { "lat": 37.7749, "lng": -122.4194 },
  "95101": { "lat": 37.3382, "lng": -121.8863 },
  "97201": { "lat": 45.5231, "lng": -122.6765 },
  "98101": { "lat": 47.6062, "lng": -122.3321 }
}
```

- [ ] **Step 2: Write mock-provider.ts**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add lib/transport/zip-centroids.json lib/transport/mock-provider.ts
git commit -m "feat: add mock transport provider with ZIP-based distance calculation"
```

---

### Task 4: Central Dispatch Provider Stub

**Files:**
- Create: `lib/transport/central-dispatch-provider.ts`

- [ ] **Step 1: Write central-dispatch-provider.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/transport/central-dispatch-provider.ts
git commit -m "feat: add Central Dispatch provider stub (TODO: wire API)"
```

---

### Task 5: Transport Settings Helper

**Files:**
- Create: `lib/transport-settings.ts`

- [ ] **Step 1: Write transport-settings.ts**

```typescript
// lib/transport-settings.ts
// Reads and applies the admin-configurable transport markup percentage.
// All reads use the Supabase admin client (service role) — bypasses RLS.

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns the transport markup percentage from app_settings.
 * Returns 0 on any error (safe default — no markup).
 */
export async function getTransportMarkupPct(): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'transport_markup_pct')
      .single()

    if (error || !data) return 0

    const pct = parseInt(data.value, 10)
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return 0
    return pct
  } catch {
    return 0
  }
}

/**
 * Applies a markup percentage to a fee in cents.
 * Pure function — safe to call anywhere.
 */
export function applyMarkup(fee_cents: number, markup_pct: number): number {
  if (markup_pct === 0) return fee_cents
  return Math.round(fee_cents * (1 + markup_pct / 100))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/transport-settings.ts
git commit -m "feat: add transport markup settings helper"
```

---

## Chunk 2: Quote Action + Listing Wizard + Checkout Flow

### Task 6: Transport Quote Server Action

**Files:**
- Create: `app/actions/transport.ts`

- [ ] **Step 1: Write app/actions/transport.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/transport.ts
git commit -m "feat: add getTransportQuoteAction server action"
```

---

### Task 7: Add pickup_zip to Listing Schema + Publish Guard

**Files:**
- Modify: `lib/validations/listing.ts`
- Modify: `app/actions/listings.ts`

- [ ] **Step 1: Read current files (already done above)**

- [ ] **Step 2: Update detailsStepSchema in lib/validations/listing.ts**

Add `pickup_zip` as a required field. The current schema ends at `condition_notes`:

```typescript
// lib/validations/listing.ts
import { z } from 'zod'

// VIN: 17 chars, no I/O/Q (SAE J112 standard)
export const vinStepSchema = z.object({
  vin: z
    .string()
    .length(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'VIN contains invalid characters (I, O, Q not allowed)'),
})

export const detailsStepSchema = z.object({
  make:            z.string().min(1, 'Make is required'),
  model:           z.string().min(1, 'Model is required'),
  year:            z.number().int().min(1900).max(2100),
  mileage:         z.number().int().min(0, 'Mileage cannot be negative'),
  price_cents:     z.number().int().positive('Price must be greater than zero'),
  color:           z.string().optional(),
  condition_notes: z.string().optional(),
  pickup_zip:      z.string().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code'),
})

export type VinStepInput     = z.infer<typeof vinStepSchema>
export type DetailsStepInput = z.infer<typeof detailsStepSchema>
```

- [ ] **Step 3: Add publish guard to publishListingAction in app/actions/listings.ts**

Replace the existing `publishListingAction` function:

```typescript
export async function publishListingAction(
  listingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Guard: pickup_zip must be set before publishing
  const { data: listing } = await supabase
    .from('listings')
    .select('pickup_zip')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .single()

  if (!listing) return { error: 'Listing not found' }
  if (!listing.pickup_zip) return { error: 'Pickup ZIP code is required before publishing. Go back to Vehicle Details and add it.' }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/seller/dashboard')
  revalidatePath('/')
  return { success: true }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/sickle/Coding/Coast && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `pickup_zip` or `DetailsStepInput`.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/listing.ts app/actions/listings.ts
git commit -m "feat: add pickup_zip to listing schema and publish guard"
```

---

### Task 8: Add pickup_zip Field to Listing Wizard Step 2

**Files:**
- Modify: `components/listings/wizard/StepVehicleDetails.tsx`

- [ ] **Step 1: Update StepVehicleDetails to include pickup_zip**

The component uses `useForm` with `zodResolver(detailsStepSchema.extend(...))`. Adding `pickup_zip` to `detailsStepSchema` automatically includes it in the inferred type. We only need to add the field to `defaultValues` and add the JSX input.

Replace the full component:

```typescript
// components/listings/wizard/StepVehicleDetails.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { detailsStepSchema, type DetailsStepInput } from '@/lib/validations/listing'
import { updateListingAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface StepVehicleDetailsProps {
  listingId: string
  initialData?: Record<string, unknown>
  onSave: () => void
}

export function StepVehicleDetails({ listingId, initialData, onSave }: StepVehicleDetailsProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<DetailsStepInput & { price: number }>({
    resolver: zodResolver(detailsStepSchema.extend({ price: detailsStepSchema.shape.price_cents.optional() }).omit({ price_cents: true }).extend({ price: detailsStepSchema.shape.price_cents.optional() })) as never,
    defaultValues: {
      make:            (initialData?.make as string) ?? '',
      model:           (initialData?.model as string) ?? '',
      year:            (initialData?.year as number) ?? new Date().getFullYear(),
      mileage:         (initialData?.mileage as number) ?? 0,
      price:           initialData?.price_cents ? (initialData.price_cents as number) / 100 : 0,
      color:           (initialData?.color as string) ?? '',
      condition_notes: (initialData?.condition_notes as string) ?? '',
      pickup_zip:      (initialData?.pickup_zip as string) ?? '',
    },
  })

  async function onSubmit(data: DetailsStepInput & { price: number }) {
    setServerError(null)
    const { price, ...rest } = data as { price: number } & Omit<DetailsStepInput, 'price_cents'>
    const result = await updateListingAction(listingId, { ...rest, price_cents: Math.round(price * 100) })
    if ('error' in result) {
      setServerError(result.error)
      return
    }
    onSave()
  }

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Vehicle Details</h2>
      <p className="mb-6 text-sm text-[#78716c]">Fill in the vehicle details. Pre-filled fields are editable.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit as never)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="make" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Make *</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="Honda" {...field} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
            <FormField control={form.control} name="model" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Model *</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="Accord" {...field} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="year" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Year *</FormLabel>
                <FormControl><Input type="number" className="border-[#e7e5e4] bg-white text-[#1c1917]" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
            <FormField control={form.control} name="mileage" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Mileage *</FormLabel>
                <FormControl><Input type="number" className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="45000" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name={"price" as never} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Price (USD) *</FormLabel>
                <FormControl><Input type="number" step="0.01" className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="15000" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Color</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="Silver" {...field} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="condition_notes" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#78716c]">Condition Notes</FormLabel>
              <FormControl>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-600 focus:outline-none"
                  placeholder="Describe the vehicle condition..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )} />

          <FormField control={form.control} name={"pickup_zip" as never} render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#78716c]">Vehicle Pickup ZIP *</FormLabel>
              <FormControl>
                <Input
                  className="border-[#e7e5e4] bg-white text-[#1c1917]"
                  placeholder="78701"
                  maxLength={5}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-[#a8a29e] mt-1">ZIP code where buyers will pick up or where transport begins</p>
              <FormMessage className="text-red-500" />
            </FormItem>
          )} />

          {serverError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
            {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/listings/wizard/StepVehicleDetails.tsx
git commit -m "feat: add pickup_zip field to listing wizard Step 2"
```

---

### Task 9: proceedToCheckout Server Action

**Files:**
- Modify: `app/actions/checkout.ts`

- [ ] **Step 1: Add proceedToCheckout to checkout.ts**

Keep the existing `createCheckoutSession` function intact (it may be used elsewhere). Add `proceedToCheckout` below it:

```typescript
// Add to the top imports in app/actions/checkout.ts:
import { getTransportProvider } from '@/lib/transport'
import { getTransportMarkupPct, applyMarkup } from '@/lib/transport-settings'
```

Add this function after `createCheckoutSession`:

```typescript
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

  const line_items: Parameters<typeof stripe.checkout.sessions.create>[0]['line_items'] = [
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/sickle/Coding/Coast && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/actions/checkout.ts
git commit -m "feat: add proceedToCheckout server action with server-side transport fee"
```

---

### Task 10: Transport Step Page + TransportForm Component

**Files:**
- Create: `app/(public)/checkout/[listingId]/transport/page.tsx`
- Create: `components/checkout/TransportForm.tsx`

- [ ] **Step 1: Write the TransportForm client component**

```typescript
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
```

- [ ] **Step 2: Write the transport page server component**

```typescript
// app/(public)/checkout/[listingId]/transport/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransportForm } from '@/components/checkout/TransportForm'

interface Props {
  params: Promise<{ listingId: string }>
}

export default async function TransportPage({ params }: Props) {
  const { listingId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login`)

  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, year, make, model, price_cents, status, listing_photos(storage_key, position)')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()

  if (!listing) notFound()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const heroPhoto   = ((listing.listing_photos as { storage_key: string; position: number }[]) ?? [])
    .sort((a, b) => a.position - b.position)[0]
  const heroUrl     = heroPhoto
    ? `${supabaseUrl}/storage/v1/object/public/car-photos/${heroPhoto.storage_key}`
    : null

  const vehicleTitle =
    listing.title ??
    [listing.year, listing.make, listing.model].filter(Boolean).join(' ') ??
    'Vehicle'

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <TransportForm
        listingId={listing.id}
        vehicleTitle={vehicleTitle}
        priceCents={listing.price_cents ?? 0}
        heroUrl={heroUrl}
      />
    </main>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/sickle/Coding/Coast && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/checkout/[listingId]/transport/page.tsx \
        components/checkout/TransportForm.tsx
git commit -m "feat: add transport step page and TransportForm component"
```

---

### Task 11: Update Listing Detail Page — Replace Form with Link

**Files:**
- Modify: `app/(public)/listings/[id]/page.tsx`

- [ ] **Step 1: Remove the form import and replace with Link**

In `app/(public)/listings/[id]/page.tsx`, the change is:
1. Remove `import { createCheckoutSession } from '@/app/actions/checkout'` (no longer used on this page)
2. Remove `import { BuyNowButton } from '@/components/storefront/BuyNowButton'` (no longer used)
3. Replace the form block with a `<Link>` that goes to the transport page

The `canBuy` block currently reads:
```tsx
<form action={createCheckoutSession.bind(null, listing.id)}>
  <BuyNowButton priceCents={listing.price_cents} />
</form>
```

Replace with:
```tsx
<Link
  href={`/checkout/${listing.id}/transport`}
  className="block w-full rounded-xl bg-blue-600 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-blue-500"
>
  Buy Now — {listing.price_cents != null ? `$${(listing.price_cents / 100).toLocaleString('en-US')}` : '—'}
</Link>
```

The `Link` import is already present (`import Link from 'next/link'`).

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/sickle/Coding/Coast && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add app/(public)/listings/[id]/page.tsx
git commit -m "feat: replace direct checkout form with transport step link on listing detail"
```

---

## Chunk 3: Post-Payment + Admin Settings + Order Detail

### Task 12: Transport Dispatch Function

**Files:**
- Create: `lib/transport/dispatch.ts`

- [ ] **Step 1: Write dispatch.ts**

```typescript
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
  await supabase
    .from('orders')
    .update({ transport_status: 'pending' })
    .eq('id', orderId)

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

    await supabase
      .from('orders')
      .update({
        transport_dispatch_id: result.dispatch_id,
        transport_status:      'dispatched',
      })
      .eq('id', orderId)

    console.log('[transport] Dispatched order', orderId, '→', result.dispatch_id)
  } catch (err) {
    console.error('[transport] Dispatch failed for order', orderId, err)
    await supabase
      .from('orders')
      .update({ transport_status: 'failed' })
      .eq('id', orderId)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/transport/dispatch.ts
git commit -m "feat: add dispatchTransportOrder function"
```

---

### Task 13: Update fulfillment.ts — Parallel Dispatch + vehicle_price_cents

**Files:**
- Modify: `lib/fulfillment.ts`

The change has two parts:
1. Wrap the existing document generation logic in `_generateDocuments()`, call it alongside `dispatchTransportOrder` via `Promise.allSettled`
2. Use `order.vehicle_price_cents ?? order.price_cents` for `priceCents` in `docData`

- [ ] **Step 1: Update fulfillment.ts**

Replace the entire file content:

```typescript
// lib/fulfillment.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { getEnvelopesApi, DOCUMENT_IDS } from '@/lib/docusign'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { generatePurchaseAgreement } from '@/lib/pdf/purchase-agreement'
import { generateBillOfSale } from '@/lib/pdf/bill-of-sale'
import { SigningRequestEmail } from '@/lib/email/signing-request'
import { dispatchTransportOrder } from '@/lib/transport/dispatch'
import { render } from '@react-email/components'
import * as React from 'react'
import type {
  Document,
  SignHere,
  DateSigned,
  Signer,
  Tabs,
  Recipients,
  EnvelopeDefinition,
} from 'docusign-esign'

/**
 * Post-payment pipeline orchestrator.
 *
 * Called asynchronously (fire-and-forget) from the Stripe webhook via after().
 * Runs document generation and transport dispatch in parallel via Promise.allSettled
 * so a dispatch failure never blocks documents (and vice versa).
 */
export async function generateAndSendDocuments(orderId: string): Promise<void> {
  const [docsResult, dispatchResult] = await Promise.allSettled([
    _generateDocuments(orderId),
    dispatchTransportOrder(orderId),
  ])

  if (docsResult.status === 'rejected') {
    console.error('[fulfillment] Document pipeline failed for order', orderId, docsResult.reason)
  }
  if (dispatchResult.status === 'rejected') {
    console.error('[fulfillment] Transport dispatch failed for order', orderId, dispatchResult.reason)
  }
}

/**
 * Internal: generate PDFs, upload to storage, send to DocuSign, notify buyer.
 * Steps:
 *  1. Fetch order with listing and buyer/seller profiles
 *  2. Generate purchase agreement and bill of sale PDFs
 *  3. Upload both to `order-documents` bucket
 *  4. Update order_documents rows with storage_key
 *  5. Send to DocuSign (single envelope, buyer as signer, two documents)
 *  6. Store esign_ref (envelope ID) on both order_documents rows
 *  7. Update order_documents status to 'sent'
 *  8. Update orders.status to 'documents_sent'
 *  9. Send NOTF-03 (signing request notification) via Resend
 */
async function _generateDocuments(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // --- Step 1: Fetch order data ---
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, listing_id, buyer_id, seller_id, price_cents, vehicle_price_cents')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[fulfillment] Failed to fetch order', orderId, orderError)
      return
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('title, vin, year, make, model, mileage, exterior_color')
      .eq('id', order.listing_id)
      .single()

    if (listingError || !listing) {
      console.error('[fulfillment] Failed to fetch listing for order', orderId, listingError)
      return
    }

    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select('full_name, email, business_name')
      .eq('id', order.buyer_id)
      .single()

    if (buyerError || !buyer) {
      console.error('[fulfillment] Failed to fetch buyer profile for order', orderId, buyerError)
      return
    }

    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', order.seller_id)
      .single()

    if (sellerError || !seller) {
      console.error('[fulfillment] Failed to fetch seller profile for order', orderId, sellerError)
      return
    }

    const orderNumber = orderId.slice(0, 8).toUpperCase()
    const today = new Date().toISOString().slice(0, 10)
    const buyerName  = buyer.full_name ?? buyer.email ?? 'Buyer'
    const sellerName = seller.business_name ?? seller.full_name ?? 'Seller'
    const vehicleTitle =
      listing.title ??
      [listing.year, listing.make, listing.model].filter(Boolean).join(' ') ??
      'Vehicle'

    const docData = {
      vin:        listing.vin      ?? '',
      year:       listing.year     ?? 0,
      make:       listing.make     ?? '',
      model:      listing.model    ?? '',
      mileage:    listing.mileage  ?? 0,
      color:      listing.exterior_color ?? '',
      // Use vehicle_price_cents (vehicle only) for legal documents — not Stripe amount_total
      priceCents: order.vehicle_price_cents ?? order.price_cents ?? 0,
      buyerName,
      buyerEmail: buyer.email ?? '',
      sellerName,
      date:        today,
      orderNumber,
    }

    // --- Step 2: Generate PDFs ---
    const [purchaseAgreementBuffer, billOfSaleBuffer] = await Promise.all([
      generatePurchaseAgreement(docData),
      generateBillOfSale(docData),
    ])

    // --- Step 3: Upload PDFs to order-documents bucket ---
    const paKey  = `${orderId}/purchase-agreement.pdf`
    const bosKey = `${orderId}/bill-of-sale.pdf`

    const [paUpload, bosUpload] = await Promise.all([
      supabase.storage.from('order-documents').upload(paKey, purchaseAgreementBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      }),
      supabase.storage.from('order-documents').upload(bosKey, billOfSaleBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      }),
    ])

    if (paUpload.error)  console.error('[fulfillment] Failed to upload purchase agreement', orderId, paUpload.error)
    if (bosUpload.error) console.error('[fulfillment] Failed to upload bill of sale', orderId, bosUpload.error)

    // --- Step 4: Update order_documents rows with storage_key ---
    await Promise.all([
      supabase
        .from('order_documents')
        .update({ storage_key: paKey })
        .eq('order_id', orderId)
        .eq('document_type', 'purchase_agreement'),
      supabase
        .from('order_documents')
        .update({ storage_key: bosKey })
        .eq('order_id', orderId)
        .eq('document_type', 'title_transfer'),
    ])

    // --- Step 5: Send to DocuSign ---
    const paDoc: Document = {
      documentBase64: purchaseAgreementBuffer.toString('base64'),
      name:           'Purchase Agreement',
      fileExtension:  'pdf',
      documentId:     DOCUMENT_IDS.purchase_agreement,
    }

    const bosDoc: Document = {
      documentBase64: billOfSaleBuffer.toString('base64'),
      name:           'Bill of Sale',
      fileExtension:  'pdf',
      documentId:     DOCUMENT_IDS.title_transfer,
    }

    const signHere: SignHere = {
      anchorString:  '{{BUYER_SIGNATURE}}',
      anchorUnits:   'pixels',
      anchorXOffset: '0',
      anchorYOffset: '0',
    }

    const dateSigned: DateSigned = {
      anchorString:  '{{BUYER_DATE}}',
      anchorUnits:   'pixels',
      anchorXOffset: '0',
      anchorYOffset: '0',
    }

    const tabs: Tabs = { signHereTabs: [signHere], dateSignedTabs: [dateSigned] }

    const signer: Signer = {
      email:       buyer.email ?? '',
      name:        buyerName,
      recipientId: '1',
      tabs,
    }

    const recipients: Recipients = { signers: [signer] }

    const envelopeDef: EnvelopeDefinition = {
      emailSubject: `Please sign your vehicle purchase documents — ${vehicleTitle}`,
      emailBlurb:   'Your vehicle purchase documents are ready for your signature.',
      documents:    [paDoc, bosDoc],
      recipients,
      status:       'sent',
    }

    let envelopeId: string | undefined
    try {
      const accountId = process.env.DOCUSIGN_ACCOUNT_ID
      if (!accountId) {
        console.error('[fulfillment] DOCUSIGN_ACCOUNT_ID is not set')
        return
      }
      const envelopesApi = await getEnvelopesApi()
      const result       = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envelopeDef })
      envelopeId         = result.envelopeId ?? undefined
    } catch (err) {
      console.error('[fulfillment] DocuSign API error for order', orderId, err)
    }

    // --- Steps 6 & 7: Update order_documents with esign_ref and status 'sent' ---
    const docUpdate: Record<string, unknown> = { status: 'sent' }
    if (envelopeId) docUpdate.esign_ref = envelopeId

    await supabase
      .from('order_documents')
      .update(docUpdate)
      .eq('order_id', orderId)

    // --- Step 8: Update orders.status to 'documents_sent' ---
    await supabase
      .from('orders')
      .update({ status: 'documents_sent' })
      .eq('id', orderId)

    // --- Step 9: Send NOTF-03 (signing request notification) ---
    const baseUrl  = process.env.NEXT_PUBLIC_URL ?? 'https://coastautos.com'
    const orderUrl = `${baseUrl}/account/orders/${orderId}`

    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      buyer.email ?? '',
      subject: `Your documents are ready to sign — ${vehicleTitle}`,
      html:    await render(
        React.createElement(SigningRequestEmail, { buyerName, vehicleTitle, orderNumber, orderUrl })
      ),
    })
  } catch (err) {
    console.error('[fulfillment] Unhandled error in _generateDocuments for order', orderId, err)
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/sickle/Coding/Coast && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/fulfillment.ts
git commit -m "feat: parallel transport dispatch in fulfillment pipeline, use vehicle_price_cents for docs"
```

---

### Task 14: Update Stripe Webhook — Populate Transport Fields on Order

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts`

The Stripe webhook creates the order. It needs to:
1. Also select `price_cents` from the listing (already fetched for email — extend that select)
2. Add transport fields from session metadata to the order insert

- [ ] **Step 1: Update the session metadata type, listing fetch, and order insert**

In the webhook handler, extend the metadata type:

```typescript
metadata: {
  listing_id: string
  buyer_id: string
  seller_id: string
  delivery_address?: string
  delivery_zip?: string
  transport_fee_cents?: string
  transport_quote_tbd?: string
} | null
```

Update the listing fetch to include `price_cents`:

```typescript
const { data: listing } = await supabase
  .from('listings')
  .select('title, year, make, model, price_cents')
  .eq('id', listing_id)
  .single()
```

Update the order insert to include transport fields:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/sickle/Coding/Coast && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat: populate transport fields on order creation in Stripe webhook"
```

---

### Task 15: Admin Transport Settings Page

**Files:**
- Create: `app/(admin)/admin/settings/page.tsx`
- Modify: `app/(admin)/AdminNav.tsx`

- [ ] **Step 1: Write the settings page**

```typescript
// app/(admin)/admin/settings/page.tsx
// NOTE: No 'use server' at file level — this is a Server Component page,
// not a server actions module. The inline action has its own 'use server'.
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function saveMarkup(formData: FormData) {
  'use server'
  const raw = formData.get('markup_pct')
  const pct = parseInt(String(raw), 10)
  if (Number.isNaN(pct) || pct < 0 || pct > 100) return

  const supabase = createAdminClient()
  await supabase
    .from('app_settings')
    .upsert({ key: 'transport_markup_pct', value: String(pct) })

  revalidatePath('/admin/settings')
}

export default async function AdminSettingsPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'transport_markup_pct')
    .single()

  const currentMarkup = data?.value ?? '0'

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#1c1917]">Settings</h1>

      <div className="rounded-xl border border-[#e7e5e4] bg-white p-6 max-w-md">
        <h2 className="mb-1 text-base font-semibold text-[#1c1917]">Transport Settings</h2>
        <p className="mb-4 text-sm text-[#78716c]">
          Markup applied to all transport quotes shown to buyers.
        </p>

        <form action={saveMarkup} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#78716c]">
              Transport Markup (%)
            </label>
            <input
              type="number"
              name="markup_pct"
              min={0}
              max={100}
              defaultValue={currentMarkup}
              className="w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] focus:border-blue-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-[#a8a29e]">
              0 = pass-through. 15 = add 15% to every quote.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add Settings link to AdminNav**

In `app/(admin)/AdminNav.tsx`, add `Settings` to `navItems`:

```typescript
import { LayoutDashboard, Users, Car, ShoppingCart, Settings } from 'lucide-react'

const navItems = [
  { href: '/admin',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users',    label: 'Users',     icon: Users },
  { href: '/admin/listings', label: 'Listings',  icon: Car },
  { href: '/admin/orders',   label: 'Orders',    icon: ShoppingCart },
  { href: '/admin/settings', label: 'Settings',  icon: Settings },
]
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/sickle/Coding/Coast && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/admin/settings/page.tsx app/(admin)/AdminNav.tsx
git commit -m "feat: add admin transport settings page with markup configuration"
```

---

### Task 16: Update Order Detail Page — Add Transport Section

**Files:**
- Modify: `app/(public)/account/orders/[orderId]/page.tsx`

The order detail page currently selects `*` from orders, which includes all new transport columns after migration 010. We need to:
1. Add transport fields to the `OrderRow` type
2. Add a "Delivery" section to the page

- [ ] **Step 1: Update OrderRow type**

Add to the `OrderRow` type definition:

```typescript
type OrderRow = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  status: OrderStatus
  price_cents: number
  vehicle_price_cents: number | null
  transport_fee_cents: number | null
  transport_quote_tbd: boolean
  transport_status: string
  transport_dispatch_id: string | null
  delivery_address: string | null
  delivery_zip: string | null
  created_at: string
  listings: ListingRow | null
  order_documents: OrderDocument[]
  profiles: SellerProfile | null
}
```

- [ ] **Step 2: Update the payment section to show line-item breakdown**

Replace the current "Amount Paid" row in the Payment section with a breakdown when transport data exists:

```tsx
{/* Payment section */}
<section className="rounded-xl border border-[#e7e5e4] bg-white p-6">
  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Payment</p>
  <div className="space-y-3">
    {typedOrder.vehicle_price_cents != null ? (
      <>
        <div className="flex justify-between text-sm">
          <span className="text-[#a8a29e]">Vehicle</span>
          <span className="text-[#57534e]">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
              typedOrder.vehicle_price_cents / 100
            )}
          </span>
        </div>
        {typedOrder.transport_fee_cents != null && (
          <div className="flex justify-between text-sm">
            <span className="text-[#a8a29e]">Transport</span>
            <span className="text-[#57534e]">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                typedOrder.transport_fee_cents / 100
              )}
            </span>
          </div>
        )}
        {typedOrder.transport_quote_tbd && (
          <div className="flex justify-between text-sm">
            <span className="text-[#a8a29e]">Transport</span>
            <span className="text-[#a8a29e] italic">TBD — we'll contact you</span>
          </div>
        )}
        <div className="flex justify-between border-t border-[#e7e5e4] pt-3 text-sm">
          <span className="font-semibold text-[#1c1917]">Total Paid</span>
          <span className="text-lg font-semibold text-[#1c1917]">{formattedPrice}</span>
        </div>
      </>
    ) : (
      <div className="flex justify-between text-sm">
        <span className="text-[#a8a29e]">Amount Paid</span>
        <span className="text-lg font-semibold text-[#1c1917]">{formattedPrice}</span>
      </div>
    )}
    <div className="flex justify-between text-sm">
      <span className="text-[#a8a29e]">Date</span>
      <span className="text-[#57534e]">{formattedDate}</span>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add Delivery section after Payment section**

Add this section between Payment and Documents:

```tsx
{/* Delivery section — shown when transport was arranged */}
{typedOrder.delivery_address && (
  <section className="rounded-xl border border-[#e7e5e4] bg-white p-6">
    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Delivery</p>
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-[#a8a29e]">Address</span>
        <span className="text-right text-[#57534e]">{typedOrder.delivery_address}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-[#a8a29e]">Transport Status</span>
        <TransportStatusBadge status={typedOrder.transport_status} />
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 4: Add TransportStatusBadge helper component**

Add this helper function near the other badge components in the file:

```typescript
function TransportStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    not_requested: { label: 'Not Requested',  className: 'bg-[#f5f5f4] text-[#78716c]' },
    pending:       { label: 'Arranging',      className: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
    dispatched:    { label: 'Dispatched',     className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
    failed:        { label: 'Issue — Contact Support', className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  }
  const { label, className } = config[status] ?? config.not_requested
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/sickle/Coding/Coast && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/(public)/account/orders/[orderId]/page.tsx
git commit -m "feat: add transport delivery section and payment breakdown to order detail page"
```

---

### Task 17: Final Build Verification

- [ ] **Step 1: Run full TypeScript check**

```bash
cd /Users/sickle/Coding/Coast && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Run Next.js build**

```bash
cd /Users/sickle/Coding/Coast && npm run build 2>&1 | tail -30
```

Expected: successful build, no type errors or compilation failures.

- [ ] **Step 3: Manual smoke test (dev server)**

```bash
cd /Users/sickle/Coding/Coast && npm run dev
```

Verify:
1. Navigate to a listing detail page → "Buy Now" link goes to `/checkout/[id]/transport`
2. Transport page loads, shows vehicle summary
3. Entering a ZIP triggers quote (shows price breakdown)
4. Invalid ZIP shows TBD banner
5. Seller listing wizard Step 2 has `pickup_zip` field
6. Admin `/admin/settings` shows Transport Settings section

- [ ] **Step 4: Final commit**

```bash
git add -A
git status
# Confirm only expected files are staged, then:
git commit -m "feat: complete transport service implementation"
```
