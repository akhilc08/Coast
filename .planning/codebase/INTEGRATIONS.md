# External Integrations

**Analysis Date:** 2026-04-01

## APIs & External Services

**Payments:**
- Stripe - Checkout sessions, payment processing, webhook verification
  - SDK/Client: `stripe` ^20.4 (server-only, `lib/stripe.ts`)
  - API version: `2026-02-25.clover`
  - Auth: `STRIPE_SECRET_KEY` (server), `STRIPE_WEBHOOK_SECRET` (webhook HMAC)
  - Webhook endpoint: `app/api/webhooks/stripe/route.ts` — handles `checkout.session.completed`
  - Flow: creates Stripe Checkout session → webhook fires on payment → order created, emails sent, documents generated

**E-Signatures:**
- Dropbox Sign - Electronic signature for purchase agreements and bills of sale
  - SDK/Client: `@dropbox/sign` ^1.10 (server-only, `lib/dropboxsign.ts`)
  - Auth: `DROPBOX_SIGN_API_KEY`
  - Webhook endpoint: `app/api/webhooks/dropboxsign/route.ts` — handles `signature_request_all_signed`
  - Webhook verification: HMAC via `EventCallbackHelper.isValid()`
  - Remnant: `app/api/webhooks/docusign/` directory exists but contains no `route.ts` — DocuSign fully removed
  - Flow: PDFs generated → uploaded to Supabase Storage → sent to Dropbox Sign → signed PDF downloaded and stored on completion

**Email:**
- Resend - Transactional email delivery
  - SDK/Client: `resend` ^6.9 (server-only, `lib/resend.ts`)
  - Auth: `RESEND_API_KEY`
  - Sender address: `Coast <no-reply@drivewithcoast.com>`
  - Admin recipient: `ADMIN_EMAIL` env var
  - Templates (React Email components in `lib/email/`):
    - `order-confirmation.tsx` — NOTF-01: buyer order confirmation
    - `admin-order-alert.tsx` — NOTF-02: admin new order alert
    - `signing-request.tsx` — NOTF-03: buyer document signing request
    - `documents-complete.tsx` — NOTF-04: buyer signed documents ready

**AI / Machine Learning:**
- Anthropic Claude - Vehicle inspection report analysis (PDF extraction)
  - SDK/Client: `@anthropic-ai/sdk` ^0.80 (server-only, `app/api/condition/extract/route.ts`)
  - Auth: `ANTHROPIC_API_KEY`
  - Model: `claude-sonnet-4-6`
  - Usage: parses inspection PDF via base64 document block, extracts structured condition data (exterior, interior, mechanical, tires) as JSON
  - Also used in `app/api/grading/` (grading callback route)

**Vehicle Data:**
- NHTSA vPIC API - VIN decoding (free, no auth required)
  - Client: native `fetch` (`lib/nhtsa.ts`)
  - Endpoint: `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json`
  - Caching: `{ next: { revalidate: 86400 } }` (24-hour Next.js cache)

**Transport:**
- Central Dispatch - Vehicle transport carrier network (not yet implemented)
  - Client stub: `lib/transport/central-dispatch-provider.ts`
  - Auth: `CENTRAL_DISPATCH_API_KEY`, `CENTRAL_DISPATCH_API_URL` (required when activated)
  - Activation: set `TRANSPORT_PROVIDER=central_dispatch` env var
  - Status: stub only — both `getQuote()` and `dispatch()` throw `Error('Central Dispatch API not yet configured')`
  - Currently: mock provider (`lib/transport/mock-provider.ts`) is active
  - Provider selected by: `lib/transport/index.ts` (`getTransportProvider()`)
  - Planned webhook: `/api/webhooks/central-dispatch` for `in_transit`/`delivered` status updates (not yet built)

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - Primary database and auth
  - Client (browser): `@supabase/supabase-js` via `lib/supabase/browser.ts`
  - Client (server RSC/actions): `@supabase/ssr` via `lib/supabase/server.ts` (cookie-based session)
  - Client (admin/service role): `@supabase/supabase-js` via `lib/supabase/admin.ts` (bypasses RLS)
  - Public env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Secret env var: `SUPABASE_SERVICE_ROLE_KEY` (admin client, server-only)
  - Key tables: `listings`, `orders`, `order_documents`, `profiles`, `app_settings`

**File Storage:**
- Supabase Storage - All file storage (same Supabase project)
  - Bucket `car-photos` — listing vehicle photos (public URLs via `lib/storage.ts`)
  - Bucket `car-documents` — seller-uploaded inspection report PDFs (used by AI extraction)
  - Bucket `order-documents` — generated and signed PDFs per order (keys: `{orderId}/purchase-agreement.pdf`, `{orderId}/bill-of-sale.pdf`, `{orderId}/signed-documents.pdf`)
  - Remote image pattern in `next.config.ts`: `*.supabase.co/storage/v1/object/public/**` and `*.supabase.co/storage/v1/render/image/public/**`

**Caching:**
- Next.js fetch cache for NHTSA API calls (24h revalidate)
- No Redis or external cache layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Built-in auth (email/password)
  - Implementation: `@supabase/ssr` cookie-based session in middleware and server components
  - Auth routes: `app/auth/callback/`, `app/auth/confirm/`, `app/auth/reset-password/`
  - Public pages: `app/(public)/login/`, `app/(public)/signup/`, `app/(public)/forgot-password/`
  - Role access: route groups `(public)`, `(seller)`, `(admin)` with layout-level auth guards

## Monitoring & Observability

**Analytics:**
- Vercel Analytics (`@vercel/analytics`) - Page view and web vitals tracking

**Error Tracking:**
- None detected — errors logged to `console.error` only

**Logs:**
- `console.log` / `console.error` throughout `lib/` server code; no structured logging library

## CI/CD & Deployment

**Hosting:**
- Vercel (`.vercel/` config present)
- Uses Vercel `after()` from `next/server` for deferred post-response work in the Stripe webhook

**CI Pipeline:**
- None detected (no GitHub Actions or other CI config found)

## Environment Configuration

**Required env vars (from source code):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (public)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `STRIPE_SECRET_KEY` — Stripe secret API key (server-only)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (server-only)
- `RESEND_API_KEY` — Resend email API key (server-only)
- `ADMIN_EMAIL` — Admin recipient for order alert emails
- `DROPBOX_SIGN_API_KEY` — Dropbox Sign API key (server-only)
- `ANTHROPIC_API_KEY` — Anthropic Claude API key (server-only)
- `NEXT_PUBLIC_URL` — Public base URL (e.g., `https://coastautos.com`), used for order links in emails
- `TRANSPORT_PROVIDER` — Optional; set to `central_dispatch` to activate real transport provider (defaults to mock)
- `CENTRAL_DISPATCH_API_KEY` — Required if `TRANSPORT_PROVIDER=central_dispatch`
- `CENTRAL_DISPATCH_API_URL` — Required if `TRANSPORT_PROVIDER=central_dispatch`
- `PLAYWRIGHT_BASE_URL` — Optional; overrides test base URL (defaults to `http://localhost:3000`)

**Secrets location:**
- `.env.local` (gitignored, not present in repo — no `.env.example` exists)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhooks/stripe` — Stripe `checkout.session.completed` events; HMAC verified via `stripe.webhooks.constructEvent`
- `POST /api/webhooks/dropboxsign` — Dropbox Sign `signature_request_all_signed` events; HMAC verified via `EventCallbackHelper.isValid()`
- `app/api/webhooks/docusign/` — Directory exists, no handler (remnant from DocuSign removal)

**Outgoing:**
- Dropbox Sign — signature requests sent server-to-server from `lib/fulfillment.ts`
- Resend — emails sent from Stripe webhook handler and Dropbox Sign webhook handler
- Anthropic — API calls from `app/api/condition/extract/route.ts` and `app/api/grading/`
- NHTSA vPIC — fetch calls from `lib/nhtsa.ts`

---

*Integration audit: 2026-04-01*
