# Architecture

**Analysis Date:** 2026-04-01

## Pattern Overview

**Overall:** Next.js 15 App Router — server-first, role-based SPA with a post-payment async pipeline

**Key Characteristics:**
- React Server Components are the default; `'use client'` added only when interactivity requires it
- All mutations go through Next.js Server Actions (`'use server'`) — no REST layer for writes
- Read queries live in `lib/queries/` and are called directly from Server Components
- Route groups (`(public)`, `(seller)`, `(admin)`) enforce layout and auth context per audience
- Post-payment work (document generation, transport dispatch) runs via `after()` outside the webhook response window

## Layers

**Routing / Pages:**
- Purpose: URL-addressable pages, layouts, and route handlers
- Location: `app/`
- Contains: `page.tsx`, `layout.tsx`, `route.ts` files
- Depends on: Server Actions, `lib/queries/`, components
- Used by: Next.js router

**Server Actions:**
- Purpose: All data mutations triggered from the browser
- Location: `app/actions/`
- Contains: `listings.ts`, `checkout.ts`, `orders.ts`, `admin.ts`, `profile.ts`, `reviews.ts`, `transport.ts`
- Depends on: `lib/supabase/server.ts` (RLS-scoped), `lib/supabase/admin.ts` (bypass RLS where needed), `lib/stripe.ts`, `lib/transport/`
- Used by: Client components and Server Components via `action={...}` or `startTransition`

**API Route Handlers:**
- Purpose: Inbound webhooks and endpoints requiring raw request access
- Location: `app/api/`
- Contains: `webhooks/stripe/route.ts`, `webhooks/dropboxsign/route.ts`, `condition/extract/route.ts`, `grading/callback/route.ts`, `contact/route.ts`
- Depends on: `lib/supabase/admin.ts`, `lib/fulfillment.ts`, `lib/stripe.ts`, `lib/dropboxsign.ts`
- Used by: Stripe, Dropbox Sign, and internal AI condition extraction

**Query Functions:**
- Purpose: Read-only data access for Server Components
- Location: `lib/queries/`
- Contains: `listings.ts` (filtered/paginated listing queries), `reviews.ts` (seller rating aggregation)
- Depends on: `lib/supabase/server.ts`
- Used by: Page Server Components

**Service / Integration Clients:**
- Purpose: Thin wrappers around external SDKs
- Location: `lib/`
- Contains: `stripe.ts`, `resend.ts`, `dropboxsign.ts`, `nhtsa.ts`, `storage.ts`, `fulfillment.ts`
- Depends on: Environment variables
- Used by: Server Actions, route handlers, `lib/fulfillment.ts`

**Supabase Clients:**
- Purpose: Three distinct Supabase client factories for different security contexts
- Location: `lib/supabase/`
- `server.ts` — SSR client with cookies, respects RLS; use in Server Components and Server Actions
- `browser.ts` — browser client for client-side auth flows
- `admin.ts` — service-role client that bypasses RLS; server-only, never import client-side

**Validation Schemas:**
- Purpose: Zod schemas for all user input; shared between client forms and server actions
- Location: `lib/validations/`
- Contains: `listing.ts`, `auth.ts`, `order.ts`, `admin.ts`, `review.ts`
- Depends on: `zod`
- Used by: Server Actions (parse/validate), Client Components (form state)

**Components:**
- Purpose: React UI components
- Location: `components/`
- Subdirectories: `auth/`, `listings/`, `listings/wizard/`, `storefront/`, `reviews/`, `seller/`, `checkout/`, `admin/`, `ui/`
- Depends on: shadcn/ui primitives, Tailwind
- Used by: Pages

## Data Flow

**Listing Purchase Flow:**

1. Buyer visits `/listings/[id]` (Server Component, fetches listing via `getListing()`)
2. Clicks "Buy Now" → `BuyNowButton` (client) calls `createCheckoutSession` Server Action
3. Server Action fetches price from DB (never from client), creates Stripe Checkout Session, redirects to Stripe
4. OR: buyer selects transport at `/checkout/[listingId]/transport` → `TransportForm` calls `proceedToCheckout` Server Action which re-derives transport fee server-side
5. Stripe sends `checkout.session.completed` webhook to `app/api/webhooks/stripe/route.ts`
6. Webhook: marks listing `sold`, creates order record, sends NOTF-01/02 emails, then calls `after(() => generateAndSendDocuments(orderId))`
7. `generateAndSendDocuments` (async, post-response): generates PDFs, uploads to `order-documents` bucket, sends to Dropbox Sign, updates order status to `documents_sent`, sends NOTF-03

**Listing Creation Flow (Seller Wizard):**

1. Seller at `/seller/listings/new` → `ListingWizard` multi-step client component
2. Step 1 (VIN Lookup): calls NHTSA API for vehicle details, then `createDraftAction` Server Action
3. Steps 2–5: each step calls respective Server Actions (`updateListingAction`, `upsertPhotoPositionsAction`, `updateConditionAction`)
4. Condition step: admin can upload PDF to `car-documents` bucket → `POST /api/condition/extract` sends PDF to Claude API → returns structured `AiConditionData` → `saveAiConditionAction` stores on listing
5. Final publish: `publishListingAction` sets status to `active`

**State Management:**
- URL search params managed via `nuqs` (storefront filters, pagination)
- Wizard step state managed in `ListingWizard` component with `useState`
- Server state invalidated via `revalidatePath()` in Server Actions

## Key Abstractions

**Three-Tier Supabase Access:**
- Purpose: Distinct security levels for different contexts
- Files: `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/admin.ts`
- Pattern: Always use `server.ts` by default; use `admin.ts` only when RLS would block a legitimate operation (storage ops, cross-user queries in webhooks)

**TransportProvider Interface:**
- Purpose: Pluggable transport quoting and dispatch; env-switched between mock and Central Dispatch
- Files: `lib/transport/types.ts`, `lib/transport/index.ts`, `lib/transport/mock-provider.ts`, `lib/transport/central-dispatch-provider.ts`
- Pattern: `getTransportProvider()` factory returns the active provider based on `TRANSPORT_PROVIDER` env var

**Server Action Return Types:**
- Purpose: Consistent `{ success: true } | { error: string }` union for all mutations
- Pattern: Actions never throw — they return `{ error }` on failure so calling components can surface messages via `sonner` toast

**Post-Payment Pipeline:**
- Purpose: Heavy async work (PDFs, e-signing, transport dispatch) decoupled from webhook response
- Files: `lib/fulfillment.ts`, `app/api/webhooks/stripe/route.ts`
- Pattern: `after()` from `next/server` queues `generateAndSendDocuments` to run after response is sent; `Promise.allSettled` ensures docs and transport run in parallel without one blocking the other

## Entry Points

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: All requests
- Responsibilities: Font variables, `NuqsAdapter`, `Toaster`, Vercel Analytics

**Public Layout (`(public)`):**
- Location: `app/(public)/layout.tsx`
- Triggers: All public-facing routes (`/`, `/inventory`, `/listings/[id]`, `/account`, auth pages)
- Responsibilities: Top nav with role-aware links, auth state from Supabase SSR

**Seller Layout (`(seller)`):**
- Location: `app/(seller)/layout.tsx`
- Triggers: `/seller/*` routes
- Responsibilities: Seller nav, redirect to `/login` if unauthenticated

**Admin Layout (`(admin)`):**
- Location: `app/(admin)/layout.tsx`
- Triggers: `/admin/*` routes
- Responsibilities: Sidebar nav, redirect to `/login` if unauthenticated, redirect to `/` if not `admin` role

**Middleware:**
- Location: `middleware.ts`
- Triggers: All non-static requests (configured via `matcher`)
- Responsibilities: Refresh Supabase session tokens, enforce route guards for `/account`, `/seller/*`, `/admin` based on `user.app_metadata.role`

## Error Handling

**Strategy:** Fail-safe returns from Server Actions; console.error in async pipeline; HTTP 400/404/500 from route handlers

**Patterns:**
- Server Actions return `{ error: string }` rather than throwing — callers check and surface via `sonner` toast
- Route handlers return explicit HTTP status codes with text bodies (e.g., `new Response('Webhook signature verification failed', { status: 400 })`)
- `fulfillment.ts` uses `Promise.allSettled` so partial failures (e.g., transport dispatch fails) don't abort document generation
- Supabase query errors are checked inline: `if (error || !data) return { error: error.message }`

## Cross-Cutting Concerns

**Logging:** `console.error` only — no structured logging library. Prefixed with `[fulfillment]` in `lib/fulfillment.ts`.

**Validation:** Zod schemas in `lib/validations/` parsed at Server Action boundaries. Client components use the same schemas for form validation.

**Authentication:** Supabase Auth via `@supabase/ssr`. Session refreshed in middleware. Three role values in `user.app_metadata.role`: `consumer`, `wholesaler`, `admin`. Role checked in middleware and redundantly in layout Server Components.

**Idempotency:** Stripe webhook checks for existing order by `stripe_checkout_session` before processing. Status guard `.eq('status', 'active')` on listing update prevents double-sale.

---

*Architecture analysis: 2026-04-01*
