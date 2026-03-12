# Transport Service Design
**Date:** 2026-03-12
**Status:** Approved
**Project:** Coast — Vehicle Marketplace

---

## Overview

Add a car transport service to Coast that delivers purchased vehicles directly to the buyer's address. Transport fees are quoted pre-checkout and included as a separate Stripe line item. Actual dispatch to Central Dispatch is triggered automatically after payment. The integration is built mock-first: a real `CentralDispatchProvider` can be swapped in later by changing one env var.

---

## Architecture

**Approach:** Service Abstraction Layer

`lib/transport/` exposes a `TransportProvider` interface with two implementations:
- `MockTransportProvider` — active now, calculates fee from ZIP distance at $0.60/mile
- `CentralDispatchProvider` — stub, activated via `TRANSPORT_PROVIDER=central_dispatch` env var

The active provider is returned by `getTransportProvider()` in `lib/transport/index.ts`.

---

## Database Changes

### `listings` table
| Column | Type | Notes |
|--------|------|-------|
| `pickup_zip` | `TEXT NULL` | Nullable. Required before publishing (enforced in `publishListingAction`, not at draft creation). Seller's vehicle pickup location. |

**Migration 009:** `ALTER TABLE listings ADD COLUMN pickup_zip TEXT;`

### `orders` table
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `delivery_address` | `TEXT` | null | Formatted as `"{street}, {city}, {state} {zip}"` |
| `delivery_zip` | `TEXT` | null | Stored separately for quote re-verification |
| `vehicle_price_cents` | `INTEGER` | null | Vehicle price only (from listing at checkout time) |
| `transport_fee_cents` | `INTEGER` | null | Quoted transport fee; null if TBD |
| `transport_quote_tbd` | `BOOLEAN` | false | True when quote failed and buyer accepted TBD |
| `transport_status` | `TEXT` | `'not_requested'` | Enum: `not_requested`, `pending`, `dispatched`, `failed`. Values `in_transit` and `delivered` are reserved for future Central Dispatch webhook integration. |
| `transport_dispatch_id` | `TEXT` | null | Central Dispatch order ID after dispatch |

**Note on `price_cents`:** The existing `price_cents` column on `orders` stores the Stripe `amount_total` (vehicle + transport). A new `vehicle_price_cents` column stores the vehicle price alone. All legal documents (purchase agreement, bill of sale) use `vehicle_price_cents`. The order detail "Amount Paid" shows `price_cents` with a line-item breakdown.

**Migration 010:**
```sql
ALTER TABLE orders
  ADD COLUMN delivery_address TEXT,
  ADD COLUMN delivery_zip TEXT,
  ADD COLUMN vehicle_price_cents INTEGER,
  ADD COLUMN transport_fee_cents INTEGER,
  ADD COLUMN transport_quote_tbd BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN transport_status TEXT NOT NULL DEFAULT 'not_requested',
  ADD COLUMN transport_dispatch_id TEXT;
```

### `app_settings` table (new)
| Column | Type | Notes |
|--------|------|-------|
| `key` | `TEXT PRIMARY KEY` | Setting key |
| `value` | `TEXT NOT NULL` | JSON-serializable value |

Seed: `INSERT INTO app_settings (key, value) VALUES ('transport_markup_pct', '0');`

**RLS:** Admin write only. All server-side reads use the Supabase admin client (bypasses RLS).

**Migration 011:**
```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON app_settings FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
INSERT INTO app_settings (key, value) VALUES ('transport_markup_pct', '0');
```

---

## Transport Service Layer (`lib/transport/`)

### `types.ts`
```ts
interface TransportQuoteRequest {
  pickup_zip: string
  delivery_zip: string
  vehicle: { year: number; make: string; model: string }
}

interface TransportQuoteResponse {
  fee_cents: number
  distance_miles: number
  carrier?: string
  quote_id?: string
}

interface TransportDispatchRequest {
  order_id: string
  pickup_zip: string
  delivery_address: string   // formatted: "{street}, {city}, {state} {zip}"
  delivery_zip: string
  vehicle: { year: number; make: string; model: string; vin: string }
  buyer_contact: { name: string; phone?: string; email: string }
}

interface TransportDispatchResponse {
  dispatch_id: string
  status: 'dispatched'
  estimated_delivery_date?: string
}

interface TransportProvider {
  getQuote(req: TransportQuoteRequest): Promise<TransportQuoteResponse>
  dispatch(req: TransportDispatchRequest): Promise<TransportDispatchResponse>
}
```

### `mock-provider.ts`
- Implements `TransportProvider`
- ZIP centroid lookup: static JSON file at `lib/transport/zip-centroids.json` containing lat/lng for the top 500 US ZIPs by population. Falls back to a 500-mile estimate for unknown ZIPs.
- Fee: `Math.max(15000, Math.round(distance_miles * 0.60 * 100))` (minimum $150.00)
- Minimum $150 is intentional and visible to buyer before checkout confirmation.
- `dispatch()` returns `{ dispatch_id: 'MOCK-' + crypto.randomUUID(), status: 'dispatched' }`

### `central-dispatch-provider.ts`
- Implements `TransportProvider`
- All methods throw `new Error('Central Dispatch API not yet configured')` with `// TODO: implement Central Dispatch API` comments marking integration points
- Reads `CENTRAL_DISPATCH_API_KEY` and `CENTRAL_DISPATCH_API_URL` from env
- `// TODO: Central Dispatch status webhook handler` — a future `/api/webhooks/central-dispatch` route will handle status updates for `in_transit` and `delivered` transitions

### `index.ts`
```ts
export function getTransportProvider(): TransportProvider {
  if (process.env.TRANSPORT_PROVIDER === 'central_dispatch') {
    return new CentralDispatchProvider()
  }
  return new MockTransportProvider()
}
```

### `lib/transport-settings.ts`
- `getTransportMarkupPct(): Promise<number>` — reads `transport_markup_pct` from `app_settings` via admin client, returns integer (0–100), defaults to 0 on error
- `applyMarkup(fee_cents: number, markup_pct: number): number` — pure function: `Math.round(fee_cents * (1 + markup_pct / 100))`

### `app/actions/transport.ts` — `getTransportQuoteAction`
- **Location:** `app/actions/transport.ts`
- **Signature:** `async function getTransportQuoteAction(listingId: string, deliveryZip: string): Promise<{ fee_cents: number; distance_miles: number } | { tbd: true }>`
- **Authentication:** Requires authenticated session (redirects to login if not). Called from a client component via direct server action invocation (not a form action).
- **Flow:** Fetch listing `pickup_zip` + vehicle details from DB → call `getTransportProvider().getQuote()` → apply markup → return result. On any error, return `{ tbd: true }`.
- **Rate limiting:** No rate limiting in initial implementation (mock provider is free). Add when switching to real API.

---

## Checkout Flow

### Listing Detail Page — "Buy Now" Button
The existing `<form action={createCheckoutSession.bind(null, listing.id)}>` pattern is replaced. The "Buy Now" button becomes a standard Next.js `<Link href={'/checkout/' + listing.id + '/transport'}>` rendered as a button. The `BuyNowButton` component is updated accordingly. The old direct `createCheckoutSession` path is removed.

### Listing Wizard — Step 2 (Vehicle Details)
- Add `pickup_zip` (required text field, 5-digit US ZIP, validated with `/^\d{5}$/`)
- Update `detailsStepSchema` to include `pickup_zip: z.string().regex(/^\d{5}$/, 'Enter a 5-digit ZIP')`
- `publishListingAction` rejects with an error if `pickup_zip` is null (consistent with existing publish guards)
- Draft creation is unaffected — `pickup_zip` is nullable in the DB

### New Page: `app/(public)/checkout/[listingId]/transport/page.tsx`
Flow:
1. Buyer arrives from listing detail page (must be authenticated; redirect to login if not)
2. Page renders vehicle summary (hero photo, year/make/model, asking price)
3. Delivery address form: street address, city, state, ZIP (separate fields)
4. On ZIP blur: calls `getTransportQuoteAction(listingId, deliveryZip)` via server action
   - Success: shows transport fee and distance
   - Failure: shows "Transport fee will be determined after purchase — we'll contact you" banner
5. Price breakdown:
   - Vehicle: $XX,XXX
   - Transport to [city, state]: $X,XXX (or "TBD — we'll contact you")
   - **Total: $XX,XXX** (vehicle only if TBD)
6. "Continue to Payment" → calls `proceedToCheckout(listingId, deliveryData)` server action

### `proceedToCheckout` server action (new, in `app/actions/checkout.ts`)
- **Signature:** `async function proceedToCheckout(listingId: string, data: { street: string; city: string; state: string; zip: string })`
- **Security:** Re-derives `transport_fee_cents` server-side by calling `getTransportQuoteAction(listingId, data.zip)` — never trusts the fee shown to the client. If quote fails, proceeds with `transport_quote_tbd = true`. If the server-re-derived fee differs from what the buyer saw (e.g., markup changed between page load and form submit), the server-derived fee is used silently — no error is surfaced. The discrepancy would be at most a few percent and is considered acceptable; a future UX improvement could re-confirm with the buyer.
- Formats `delivery_address = "{street}, {city}, {state} {zip}"`
- Fetches listing `price_cents` from DB (existing security pattern)
- Calculates Stripe line items:
  - Always: vehicle line item (`listing.price_cents`)
  - When fee available: transport line item (`transport_fee_cents`, label: "Vehicle Transport — door-to-door delivery")
  - When TBD: no transport line item; Stripe total = vehicle price only
- Creates Stripe Checkout Session with metadata:
  - `delivery_address`, `delivery_zip`, `transport_fee_cents` (or empty), `transport_quote_tbd` ('true'/'false')
- Redirects to Stripe Checkout

### Stripe Webhook Update (`app/api/webhooks/stripe/route.ts`)
On `checkout.session.completed`, read transport fields from session metadata and populate order:
```ts
delivery_address: session.metadata.delivery_address ?? null,
delivery_zip: session.metadata.delivery_zip ?? null,
vehicle_price_cents: listing.price_cents,  // fetched from DB
transport_fee_cents: session.metadata.transport_fee_cents
  ? parseInt(session.metadata.transport_fee_cents) : null,
transport_quote_tbd: session.metadata.transport_quote_tbd === 'true',
transport_status: 'pending',
```

### UI Styling
All transport step UI components use Coast's existing warm light theme — same fonts, colors, spacing, card styles, and button variants as the listing wizard and seller dashboard. No new design tokens introduced.

---

## Post-Payment Dispatch

### `lib/transport/dispatch.ts` (new file)
```ts
export async function dispatchTransportOrder(orderId: string): Promise<void>
```
- Fetches order + listing + buyer profile from DB
- Buyer email is retrieved from `auth.users` via Supabase admin client (`supabaseAdmin.auth.admin.getUserById(order.buyer_id)`)
- Calls `getTransportProvider().dispatch(...)`
- On success: updates order `transport_dispatch_id`, `transport_status = 'dispatched'`
- On failure: updates order `transport_status = 'failed'`, logs error — does not throw

### `lib/fulfillment.ts` update
`generateAndSendDocuments` is updated to call `dispatchTransportOrder` in parallel using `Promise.allSettled`:
```ts
const [docsResult, dispatchResult] = await Promise.allSettled([
  _generateAndSendDocumentsInternal(orderId),
  dispatchTransportOrder(orderId),
])
// log any rejected results; do not re-throw
```
This ensures dispatch failures never block document generation.

All legal documents (purchase agreement, bill of sale) use `order.vehicle_price_cents` for the vehicle price, not `order.price_cents`.

---

## Admin Settings

- New section on the admin panel: **Transport Settings**
- Input: "Transport Markup (%)" — integer 0–100, written to `app_settings.transport_markup_pct` via admin Supabase client
- Read via `getTransportMarkupPct()` (admin client, no RLS needed)

---

## Order Detail Updates

Buyer and admin order detail pages show:
- Delivery address
- Transport fee (or "TBD — we'll contact you")
- Transport status badge (`pending`, `dispatched`, `failed`)
- Dispatch ID (admin view only)

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Quote API fails at transport page | Shows TBD banner; buyer can still proceed |
| `pickup_zip` missing on listing | Blocked at publish step in listing wizard |
| Invalid ZIP entered | Client validation (`/^\d{5}$/`); `getTransportQuoteAction` returns `{ tbd: true }` for unknown ZIPs |
| Dispatch fails post-payment | Logs error, sets `transport_status = 'failed'`; does not block document generation |
| Same/nearby ZIP (near-zero distance) | Minimum $150 fee applies; shown to buyer before payment |
| TBD fee at Stripe checkout | No transport line item added; Stripe total = vehicle price only; transport billed out-of-band |

---

## Migration Files

1. `009_listings_pickup_zip.sql` — add nullable `pickup_zip` to listings
2. `010_orders_transport_fields.sql` — add transport columns + `vehicle_price_cents` to orders
3. `011_app_settings.sql` — create `app_settings` table with RLS, seed transport markup

**Note:** Migrations must be applied in sequence (009 → 010 → 011). Any intervening migration added by other work must be renumbered accordingly.

---

## Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `TRANSPORT_PROVIDER` | No | Set to `central_dispatch` to use real API (default: mock) |
| `CENTRAL_DISPATCH_API_KEY` | When real | Central Dispatch API key |
| `CENTRAL_DISPATCH_API_URL` | When real | Central Dispatch base URL |

---

## Future Work (Out of Scope)

- `/api/webhooks/central-dispatch` — status update webhook to transition orders to `in_transit` / `delivered`
- Rate limiting on `getTransportQuoteAction` (needed before switching to real API)
- International transport (current ZIP validation is US-only)
