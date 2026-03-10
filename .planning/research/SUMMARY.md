# Project Research Summary

**Project:** Coast — Wholesale Car Marketplace
**Domain:** B2C wholesale automotive marketplace with full on-platform transaction lifecycle
**Researched:** 2026-03-09
**Confidence:** MEDIUM-HIGH

## Executive Summary

Coast is a wholesale car marketplace where admin-vetted seller partners list vehicles and general consumers purchase them entirely online — including payment, legally binding e-signature on purchase agreements, and title transfer documentation. This is a non-trivial e-commerce product because the transaction artifact is a physical asset with legal ownership implications, which means the document generation and e-signing pipeline is a first-class product requirement, not an afterthought. Comparable platforms (Carvana, Vroom for B2C; TradeRev, ADESA Digital for wholesale) validate that consumers expect polished photo presentations, transparent pricing, and clear transaction status visibility. Coast's differentiator is the promise of fully digital paperwork — most wholesale channels still require offline title and purchase agreement handling.

The recommended approach is: Next.js 15 App Router on Vercel, Supabase for database/auth/storage, Stripe Checkout (hosted, not embedded) for payments, Dropbox Sign (formerly HelloSign) for e-signatures with server-side PDF generation via `pdf-lib`, and Resend + React Email for transactional email. The stack is constrained by the project requirements and is appropriate for the domain — no significant deviations are recommended. Tailwind CSS 4 + shadcn/ui components give the design flexibility needed for a high-trust automotive brand without fighting a pre-designed component system.

The highest risks are: (1) a duplicate-purchase race condition if vehicle reservation is not made atomic at checkout creation time, (2) order fulfillment triggered by the Stripe redirect URL rather than the webhook (causing lost orders on browser close), (3) document generation blocking the webhook response and causing Stripe timeouts, and (4) Supabase RLS misconfiguration exposing consumer order history or wholesaler contact data. All four are well-understood problems with established prevention patterns — they must simply be designed in from the start rather than retrofitted.

## Key Findings

### Recommended Stack

The core stack is Next.js 15 (App Router, Server Components, Server Actions) + TypeScript 5 + Supabase (PostgreSQL + Auth + Storage) + Stripe + Dropbox Sign. The App Router route group pattern — `(public)`, `(seller)`, `(admin)` — cleanly separates the three user surfaces without URL prefixes while allowing different auth guards per layout. Supabase's `@supabase/ssr` package (not the deprecated `auth-helpers-nextjs`) is the correct pairing for Next.js 15's cookie-based session management.

**Core technologies:**
- **Next.js 15 + React 19**: Full-stack framework — Server Components for data-heavy listing pages, Server Actions for form mutations, Route Handlers for Stripe/e-sign webhooks
- **Supabase**: PostgreSQL + Auth + Storage + RLS — eliminates separate auth service; three-role system (consumer/wholesaler/admin) enforced at the database layer
- **`@supabase/ssr`**: Required for App Router — replaces deprecated `auth-helpers-nextjs`; handles session refresh in middleware automatically
- **Stripe Checkout (hosted)**: High-value, infrequent purchase = trust signal of Stripe-hosted page is an asset; eliminates PCI scope; Stripe Connect not needed (Coast collects all payments, wholesaler settlements are manual)
- **Dropbox Sign + `pdf-lib`**: E-signature API with best developer experience for embedded signing; `pdf-lib` generates purchase agreement PDFs server-side before sending for signature
- **Supabase Storage**: Three buckets — `listings-photos` (public, CDN-cached), `listings-documents` (private, signed URLs), `order-documents` (private, buyer+admin only)
- **Tailwind CSS 4 + shadcn/ui**: CSS-native config in Tailwind 4; shadcn/ui is copy-paste primitives built on Radix UI — customizable without fighting an opinionated design system
- **React Hook Form + Zod**: Canonical Next.js App Router form pattern; single schema validates both client and server (Server Actions)
- **Resend + React Email**: Transactional email written as React components; purchase confirmations, admin notifications
- **Sentry + Vercel Analytics**: Error tracking via `onRequestError` hook; zero-config page analytics

Evaluate **Docuseal** (open source, self-hostable) as an alternative to Dropbox Sign before committing — per-envelope pricing on Dropbox Sign may be a concern at volume.

### Expected Features

**Must have (table stakes):**
- Multi-photo upload with ordering, vehicle data fields (VIN, year, make, model, mileage, color), condition notes, document uploads (Carfax, title, service history), draft/publish workflow, price — all before a listing is useful
- Full-text search + faceted filters (make, year range, price range, mileage) + sorted/paginated results — any car site without this feels broken
- Stripe checkout, order confirmation email, order status visibility, listing auto-marked sold on purchase — the core transaction
- Purchase agreement generation + e-signature collection — Coast's core differentiator and legal requirement for vehicle sale
- Consumer self-signup, email verification, password reset, role-based access (consumer/wholesaler/admin)
- Admin: wholesale partner account creation, user management, all-listings/all-orders views, analytics dashboard

**Should have (competitive):**
- Car grading scaffold (image upload exists day one; `grade` column in schema; `<GradeDisplay>` shows "Grade Pending"; `/api/grading/callback` endpoint deployed as no-op stub) — AI integration deferred but infrastructure ships in v1
- VIN decode auto-fill — reduces wholesaler friction; NHTSA free API or Marketcheck
- High-quality photo gallery (lightbox, full-size access) — trust signal; most wholesale sites look like Craigslist
- Structured condition field (Excellent/Good/Fair/As-Is) — even without AI grading, buyers need at-a-glance assessment

**Defer (v2+):**
- Saved searches / watchlists
- Wholesaler performance metrics
- AI-powered car grading (scaffold infrastructure in v1, integrate service post-launch)
- In-platform messaging, auction/bidding, financing, trade-in valuation, DMS integrations

**Explicit anti-features (do not build in v1):**
- Wholesaler self-signup (admin creates all accounts — quality control is the product)
- Stripe Connect (payments flow to Coast; wholesaler settlements are manual)
- Mobile native apps (responsive web is the product)

### Architecture Approach

The system divides into three distinct surfaces in a single Next.js app: the public storefront (`/browse`, `/checkout`), the wholesaler portal (`/seller/*`), and the admin panel (`/admin/*`). Each has its own App Router route group with a layout that enforces auth and role checks at the server layer before rendering. All sensitive Supabase operations use the `service_role` key in server-only code (Server Actions, Route Handlers) — never the anon key from client components. The Stripe webhook handler at `/api/stripe/webhook` is the single authoritative signal for order creation and listing status updates.

**Major components:**
1. **Public Storefront** — browse/filter listings (Supabase FTS), vehicle detail page, initiate Stripe Checkout; no auth required for browsing
2. **Wholesaler Portal** — listing CRUD, photo and document upload (direct to Supabase Storage via signed upload URLs), view orders for own listings
3. **Admin Panel** — create wholesaler accounts, manage all listings/orders/users, analytics, issue refunds via Stripe API
4. **Stripe Webhook Handler** — `checkout.session.completed` creates order, marks listing sold, triggers document generation job; `checkout.session.expired` releases vehicle reservation
5. **Document Pipeline** — async job: generate PDF via `pdf-lib` → upload to private bucket → create Dropbox Sign signature request → store envelope ID → e-sign webhook marks order complete
6. **Car Grading Scaffold** — schema columns (`grade`, `grade_source`, `graded_at`), `/api/grading/callback` no-op stub, `<GradeDisplay>` component; activates when AI service is ready

**Schema highlights:**
- `profiles` table extends `auth.users` with `role` column (consumer/wholesaler/admin) — set server-side via trigger, never from client SDK
- `listings` table stores `price_cents` (integer, not float), `status` enum (`draft/active/sold/archived`), and grade scaffold columns
- `orders` table stores both `stripe_payment_intent` and `stripe_checkout_session` for reconciliation; `status` covers full lifecycle from `pending_payment` through `complete`/`refunded`
- Storage paths stored as bucket-relative keys, not full URLs — signed URLs generated on demand

### Critical Pitfalls

1. **Supabase RLS disabled by default** — every new table migration must enable RLS and write explicit policies for all four operations; test as each role (`anon`, `authenticated`, `wholesaler`) before shipping; never leave RLS policy gaps on `orders` or `profiles` tables
2. **JWT role confusion** — Supabase's JWT `role` claim is the PostgreSQL role (`anon`/`authenticated`), not the application role; store app roles in `profiles.role` (DB table), access via a `SECURITY DEFINER` function in RLS policies; never use `user_metadata` for role (client-settable)
3. **Stripe fulfillment on redirect, not webhook** — the `success_url` page shows "processing" only; the `checkout.session.completed` webhook exclusively creates the order record; webhook handler must be idempotent (check `stripe_checkout_session` uniqueness before processing)
4. **Vehicle double-sale race condition** — use a PostgreSQL atomic RPC (`reserve_vehicle` function with `SELECT ... FOR UPDATE`) to transition listing from `available` → `reserved` before creating the Stripe Checkout Session; release reservation on `checkout.session.expired` or timeout
5. **Document generation blocking webhook response** — Stripe requires a 5-second response window; PDF generation and e-sign API calls must be queued as background jobs (Supabase Edge Function + `document_jobs` table), not inlined in the webhook handler
6. **Service role key in client code** — `SUPABASE_SERVICE_ROLE_KEY` must never appear in `NEXT_PUBLIC_` variables or client-bundled files; admin operations route through Server Actions/Route Handlers that verify admin session first

## Implications for Roadmap

Research strongly supports an 8-phase build sequence driven by hard data dependencies. No phase can start before its listed prerequisites exist.

### Phase 1: Foundation — Auth, Schema, and Storage Architecture

**Rationale:** Auth + RLS is the dependency of everything else. Schema errors are expensive to fix in production. Storage bucket structure is locked in by the first file upload.
**Delivers:** Supabase auth working with all three roles; all database tables with RLS policies; middleware session management; three storage buckets with correct public/private configuration
**Features addressed:** Authentication and accounts (all), role-based access control
**Pitfalls avoided:** RLS disabled by default (Pitfall 1), JWT role confusion (Pitfall 2), service role key exposure (Pitfall 10), mixed public/private storage buckets (Pitfall 11)
**Research flag:** Standard patterns — well-documented Supabase + Next.js `@supabase/ssr` setup; skip phase research

### Phase 2: Wholesaler Listing Management

**Rationale:** The storefront has nothing to display without inventory. Listing management is the producer side of the marketplace — it must exist before consumers can interact.
**Delivers:** Seller portal CRUD for listings; photo upload (direct to storage via signed URLs) with image processing; document upload (Carfax, title, service history); draft/publish workflow; grading scaffold columns and `<GradeDisplay>` component
**Features addressed:** Listing management (all table stakes), car grading scaffold (differentiator)
**Pitfalls avoided:** Raw full-resolution images served to consumers (Pitfall 7) — image compression/processing pipeline must be established here; structured condition field in schema from day one (Pitfall 13)
**Research flag:** May warrant phase research on image processing approach — client-side compression (`browser-image-compression`) vs. Edge Function pipeline; decision affects storage costs and grading service inputs

### Phase 3: Public Storefront — Browse, Search, and Vehicle Detail

**Rationale:** Consumer-facing browsing requires listing data to exist (Phase 2). Search and filter implementation requires indexed schema from Phase 1.
**Delivers:** Browse page with faceted filters, full-text search (PostgreSQL `tsvector`), sorted/paginated results; vehicle detail page with photo gallery (lightbox), VIN display, condition info, document list; mobile-responsive layouts
**Features addressed:** Search and discovery (all table stakes)
**Pitfalls avoided:** N+1 photo queries and unindexed filter columns (Pitfall 8) — composite indexes on `(make, model, year)`, `(price_cents)`, `(status)`, `(created_at DESC)` must be in Phase 1 migrations; VIN decode auto-fill can be added here if scope allows
**Research flag:** Standard patterns — Supabase PostgREST filtering, Next.js Image optimization, URL-serialized filter state; skip phase research

### Phase 4: Payments — Stripe Checkout and Vehicle Reservation

**Rationale:** Payment flow requires listings to exist (Phase 2) and consumers to have accounts (Phase 1). This is the revenue-generating core; it must be hardened before any real inventory goes live.
**Delivers:** Atomic vehicle reservation RPC; `/api/checkout` Route Handler creating Stripe Checkout Session; `/api/stripe/webhook` handler for `checkout.session.completed`, `checkout.session.expired`, and `payment_intent.payment_failed`; order record creation; listing status update to `sold`; order confirmation email (Resend)
**Features addressed:** Buyer purchase flow (all table stakes), order confirmation notification
**Pitfalls avoided:** Fulfillment on redirect (Pitfall 3), missing failure event handlers (Pitfall 4), vehicle double-sale race condition (Pitfall 9)
**Research flag:** Standard patterns — Stripe Checkout + webhook architecture is extremely well-documented; skip phase research; but validate Stripe SDK version before starting

### Phase 5: Document Pipeline — PDF Generation and E-Signing

**Rationale:** Document generation is triggered by completed payments (Phase 4). This is the highest-risk phase — third-party API integration, async job design, and legal document accuracy all converge here.
**Delivers:** Async document job system (`document_jobs` table + background processor); purchase agreement PDF generation via `pdf-lib`; Dropbox Sign integration (create signature request, get embedded/email signing URL, store envelope ID); e-sign webhook handler (`/api/esign/callback`); buyer access to signed documents via Supabase Storage signed URLs; order status lifecycle through `documents_signed` → `complete`
**Features addressed:** Document/title handling (all table stakes — purchase agreement, e-signature, document delivery, status tracking)
**Pitfalls avoided:** Synchronous document generation in webhook (Pitfall 5), polling instead of e-sign webhook (Pitfall 6)
**Research flag:** NEEDS PHASE RESEARCH — Dropbox Sign vs. Docuseal pricing and API specifics should be validated before committing; title transfer document complexity (state-specific forms) may require scoping decision; async job pattern for Supabase Edge Functions needs implementation detail research

### Phase 6: Admin Panel

**Rationale:** Admin panel manages real data — it is most meaningful when orders, listings, and users actually exist. Building admin last means the panel surfaces real state from the start of testing.
**Delivers:** Wholesaler account creation (Supabase Admin API); user management (view, disable); all-listings view with status filter; all-orders view with status filter and manual status override; analytics dashboard (revenue totals, listing counts, order counts, conversion); Stripe refund initiation
**Features addressed:** Admin panel (all table stakes)
**Pitfalls avoided:** Admin realtime subscriptions in Server Components (Pitfall 15) — dashboard live updates must use Client Component wrappers
**Research flag:** Standard patterns — Next.js Server Components + service_role Supabase client; Vercel Analytics for traffic; aggregate Postgres queries for analytics; skip phase research

### Phase 7: Grading Scaffold Activation + VIN Decode

**Rationale:** Grading infrastructure (storage bucket, schema columns, API endpoint stub, UI component) ships in Phase 2; this phase activates the callback endpoint and adds any v1 refinements. VIN decode auto-fill is a low-complexity seller UX improvement deferred from Phase 2.
**Delivers:** `/api/grading/callback` activated (validates API key, writes grade to listing); `<GradeDisplay>` showing real grades when populated; VIN decode auto-fill on listing creation form (NHTSA free API); structured condition field enforcement in UI
**Features addressed:** Car grading scaffold (differentiator, v1 activation), VIN decode (differentiator)
**Research flag:** NEEDS PHASE RESEARCH — grading service selection (if activating AI grading) and NHTSA vs. paid VIN decode API tradeoffs; defer if AI service not ready

### Phase 8: Polish, Observability, and Launch Hardening

**Rationale:** Cross-cutting concerns that improve reliability and debuggability but are not feature-blocking. Address before any real consumer traffic.
**Delivers:** Sentry error tracking (Next.js 15 `onRequestError` instrumentation); Stripe webhook failure alerting; document generation failure admin UI (orders stuck in `documents_pending`); image optimization audit; mobile UX pass; reserved-listing timeout cron (release abandoned reservations after 30 minutes); unauthenticated browsing confirmed before account gate
**Pitfalls avoided:** UX gate placed too early in purchase flow (Pitfall 12)
**Research flag:** Standard patterns; skip phase research

### Phase Ordering Rationale

- Auth and schema must precede everything — no feature can be built without its tables and RLS policies
- Listing management precedes storefront — consumers cannot browse empty inventory
- Payments precede documents — the order record created by the webhook is the input to document generation
- Admin panel is last — it is the least blocked but most useful when it surfaces real data from earlier phases
- The grading scaffold spans multiple phases by design: infrastructure in Phase 2, activation optionally in Phase 7, AI integration post-v1

### Research Flags

Phases needing deeper research during planning:
- **Phase 5 (Document Pipeline):** Dropbox Sign vs. Docuseal pricing decision must be made first; title transfer document scope (state-specific forms vs. generic bill of sale) needs a product decision; async job pattern for Edge Functions is non-trivial
- **Phase 7 (Grading + VIN):** Grading service selection if AI grading is targeted for v1; VIN decode API selection (NHTSA free vs. Marketcheck/paid)
- **Phase 2 (Listing Management):** Image processing pipeline approach — client-side compression vs. server-side Edge Function; impacts both UX and future grading service inputs

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Foundation):** Supabase + Next.js `@supabase/ssr` is the official documented path; RLS patterns are stable
- **Phase 3 (Storefront):** Next.js App Router data fetching + Supabase PostgREST filtering is well-documented
- **Phase 4 (Payments):** Stripe Checkout + webhook pattern is extensively documented and stable
- **Phase 6 (Admin):** Server Component + service_role Supabase client is standard; Vercel Analytics is zero-config
- **Phase 8 (Polish):** Sentry Next.js SDK auto-instruments; no novel patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Next.js 15 + React 19 confirmed stable (Oct 2024 release). `@supabase/ssr` is officially documented current approach. Package versions (Stripe 16.x, Framer Motion 11.x) from training data Aug 2025 — verify with `npm info [pkg] version` before pinning. |
| Features | MEDIUM | Based on domain knowledge of Carvana, Vroom, ADESA Digital, TradeRev, Cars & Bids. No live competitor analysis due to tool restrictions. Feature priorities align with PROJECT.md requirements. Recommend validating against current competitor feature sets. |
| Architecture | MEDIUM-HIGH | App Router patterns (route groups, Server Components, Server Actions) are stable since Next.js 13.4. Supabase RLS patterns are stable. Schema design is project-specific — not sourced from a reference implementation. Stripe Checkout + webhook core pattern unchanged for years. |
| Pitfalls | HIGH | RLS misconfiguration patterns are well-documented and consistent across Supabase community. Stripe webhook fulfillment pitfalls are official Stripe best practices. Next.js Server/Client Component boundaries are well-understood. E-signing integration patterns are provider-specific — validate when Dropbox Sign or Docuseal is confirmed. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **E-signing provider selection:** Dropbox Sign pricing (per-envelope) vs. Docuseal (self-hosted, no per-envelope cost) must be evaluated before Phase 5 planning. This decision affects both cost model and integration complexity.
- **Title transfer document scope:** State-specific title transfer forms are legally complex and vary by state. A product decision is needed: generic bill of sale only for v1 (simpler, may be sufficient for the initial wholesale relationship), or state-specific title transfer (correct but significantly more complex). Flag for legal review.
- **Package version verification:** Stripe Node SDK, `@hellosign/node-sdk`, Framer Motion, `react-email` versions should be verified against npm before pinning — training data cutoff is August 2025.
- **Image processing pipeline design:** Client-side compression (`browser-image-compression`) is simpler for v1 but produces less consistent output for the future grading service. If AI grading is a near-term priority, a server-side processing pipeline is the better investment even in v1.
- **Vehicle reservation timeout mechanism:** Supabase doesn't have a native cron scheduler built in — either a Supabase Edge Function with a scheduled trigger, a Vercel cron job, or an external service (Trigger.dev) is needed. Decision affects Phase 4 and Phase 8 implementation.

## Sources

### Primary (HIGH confidence)
- Next.js 15 official blog — https://nextjs.org/blog/next-15 (stable release Oct 2024, confirmed)
- Supabase `@supabase/ssr` — official documented approach for Next.js App Router (replaces deprecated `auth-helpers-nextjs`)
- Stripe Checkout + webhook best practices — official Stripe documentation patterns (stable across API versions)

### Secondary (MEDIUM confidence)
- Supabase RLS + custom claims patterns — community-documented, consistent with official docs, training data through Aug 2025
- Tailwind CSS 4.0 — CSS-native config confirmed released early 2025
- shadcn/ui + React Hook Form + Zod — dominant community pattern for Next.js App Router forms as of 2025
- Dropbox Sign (HelloSign) API — developer documentation, training data; verify rebranding/SDK package name before use
- Resend + React Email — dominant transactional email pattern for new Next.js projects

### Tertiary (MEDIUM confidence, domain-specific)
- Feature landscape — derived from domain knowledge of Carvana, Vroom, ADESA Digital, TradeRev, Cars & Bids, Bring a Trailer; no live competitor analysis performed
- Automotive e-commerce UX pitfalls — training knowledge; not verified against live competitor analysis

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
