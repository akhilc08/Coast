# Technology Stack

**Project:** Coast — Wholesale Car Marketplace
**Researched:** 2026-03-09
**Confidence:** MEDIUM-HIGH (Next.js 15 confirmed via official blog; package versions from training data cutoff Aug 2025 — verify with `npm install [pkg]@latest` before pinning)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x | Full-stack React framework | Constrained by PROJECT.md. App Router gives Server Components for data-heavy listing pages, Server Actions for form mutations (admin, listing creation), and API routes for Stripe webhooks. Turbopack in dev is now stable. |
| React | 19.x | UI rendering | Ships with Next.js 15. Server Components eliminate unnecessary client JS for listing browse pages. |
| TypeScript | 5.x | Type safety | Use `next.config.ts` (now supported natively in Next.js 15). Catches shape errors in Supabase query results and Stripe webhook payloads early. |
| Node.js | 18.18+ | Runtime | Next.js 15 minimum. Use 20.x LTS in production for better performance. |

**Confidence:** HIGH — Next.js 15 stable release confirmed via official blog (published Oct 2024). React 19 ships with it.

---

### Database & Auth

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | cloud (managed) | PostgreSQL DB + Auth + Storage + Row-Level Security | Constrained by PROJECT.md. Provides auth with two distinct user roles (wholesaler/consumer) out of the box via RLS policies. Eliminates separate auth service. |
| `@supabase/supabase-js` | 2.x | Supabase JS client | Primary client for DB queries and storage operations. |
| `@supabase/ssr` | 0.x | Supabase SSR helpers for Next.js | Required for App Router cookie-based auth — replaces the deprecated `@supabase/auth-helpers-nextjs`. Handles session refresh in middleware automatically. |

**Confidence:** HIGH — `@supabase/ssr` is the officially documented approach for Next.js App Router as of 2024-2025. The `auth-helpers-nextjs` package is explicitly deprecated in Supabase docs.

**Key setup pattern:**
- Middleware reads/refreshes session cookies on every request
- Server Components use `createServerClient` from `@supabase/ssr`
- Client Components use `createBrowserClient`
- RLS policies enforce role separation at the DB layer — do not rely only on application-level checks

---

### Payments

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `stripe` (Node SDK) | 16.x | Server-side Stripe API calls, webhook handling | Industry standard. Use for creating PaymentIntents or Checkout Sessions on the server. Never call Stripe with secret key from client. |
| `@stripe/stripe-js` | 4.x | Client-side Stripe.js loader | Loads Stripe.js asynchronously, required for Stripe Elements or redirecting to Checkout. |
| `@stripe/react-stripe-js` | 2.x | React bindings for Stripe Elements | Wrap in `<Elements>` provider if using embedded payment UI. |

**Confidence:** MEDIUM — versions from training data (Aug 2025). Stripe Node SDK was at 16.x; verify `npm install stripe@latest` gives the right major before pinning.

**Pattern decision — Stripe Checkout vs Payment Element:**

Use **Stripe Checkout** (hosted redirect) for the MVP, not embedded Payment Element.

Rationale:
- Car purchases are high-value, infrequent transactions — trust signal of the Stripe-hosted page is an asset, not a liability.
- Checkout handles 3DS, SCA, payment method diversity automatically.
- Eliminates PCI scope complexity on your domain.
- Embedded Element is appropriate only if you need deep UI customization that customers will demand. Car buyers won't demand it.

Stripe Connect is NOT needed — this is not a multi-seller payout marketplace. Wholesalers are vetted partners; revenue flows to Coast. If wholesaler payouts are added later, Connect would be the path.

---

### E-Signing & Document Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Dropbox Sign API (formerly HelloSign) | REST API v3 | Collecting legally binding e-signatures on purchase agreements and title transfer docs | Best-in-class API developer experience for embedded signing. Signatures are legally valid under ESIGN Act and eIDAS. Audit trail included. |
| `@hellosign/node-sdk` | 7.x | Node.js SDK for Dropbox Sign | Typed SDK for creating signature requests, embedded sign URLs, and webhooks. |
| `pdf-lib` | 1.x | Server-side PDF generation for purchase agreement template | Pure JavaScript, no binary dependencies, works in Node.js environments. Use to generate the purchase agreement PDF server-side before sending to Dropbox Sign. |

**Confidence:** MEDIUM — Dropbox Sign (rebranded from HelloSign in 2022) remains the dominant embedded e-sign API for marketplaces as of my training cutoff. DocuSign exists but its API is enterprise-priced and developer-hostile by comparison. SignNow and Adobe Sign are viable alternatives.

**Alternative to evaluate:** **Docuseal** (open source, self-hostable). If Dropbox Sign pricing is a concern, Docuseal can be deployed to Supabase's infrastructure context or a small VPS. API-compatible signing without per-envelope costs. Worth validating pricing before committing to Dropbox Sign.

**Document flow:**
1. Purchase confirmed (Stripe webhook `payment_intent.succeeded`)
2. Server generates purchase agreement PDF via `pdf-lib`, populates buyer/vehicle fields
3. Server calls Dropbox Sign API: creates embedded signature request, gets sign URL
4. Buyer is redirected/embedded to Dropbox Sign to sign
5. Dropbox Sign webhook fires `signature_request_all_signed`
6. Signed document stored in Supabase Storage
7. Order record updated to `paperwork_complete`

---

### Image & File Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Storage | managed | Car photos, uploaded documents (Carfax, service history, title PDFs), signed purchase agreements | Already in the stack; eliminates a separate storage provider. Bucket-level and object-level RLS policies control access per role. |
| `@supabase/supabase-js` | (same) | Storage client | `.storage.from('bucket').upload()` — same client as DB. |

**Confidence:** HIGH — Supabase Storage is the obvious choice given the stack constraint. It is S3-compatible, supports RLS, and signed URLs for private documents.

**Bucket strategy:**
- `car-photos` — public bucket, images served directly for listing pages
- `car-documents` — private bucket, Carfax/service history readable only by authenticated users who bought the car or admins
- `signed-agreements` — private bucket, accessible only to the specific buyer and admin

**Image optimization:**
Use Next.js `<Image>` component with Supabase Storage URLs. Configure `remotePatterns` in `next.config.ts` to allow Supabase's CDN domain. Do NOT add a separate image optimization service (Cloudinary, Imgix) for MVP — adds cost and complexity without clear benefit when car photo counts are manageable.

---

### UI & Design System

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility-first styling | Tailwind 4 dropped the config file, uses CSS-native `@import "tailwindcss"`. Fast iteration, consistent spacing/color tokens. The right choice for a design-forward product where you'll write custom UI. |
| shadcn/ui | current (not versioned — copy-paste) | Base component primitives | Not a dependency — components are copied into `/components/ui`. Built on Radix UI primitives for accessibility. Use as a foundation, then aggressively customize. Prevents building form controls, dialogs, dropdowns from scratch. |
| Radix UI | 1.x (via shadcn) | Headless accessible primitives | Ships with shadcn/ui. Do not install Radix packages directly unless adding a primitive shadcn doesn't cover. |
| Lucide React | 0.4x | Icon library | shadcn/ui default icon set. Consistent with the component system. |
| Framer Motion | 11.x | Targeted animations | Use sparingly: page transitions, listing card hovers, photo gallery. Not for layout — Tailwind handles that. |

**Confidence:** MEDIUM-HIGH — Tailwind 4.0 released in early 2025; CSS-first config is confirmed. shadcn/ui is the dominant component-primitive pattern for Next.js App Router projects as of 2025.

**NOT recommended:**
- Material UI / Ant Design — opinionated design systems that fight customization. A wholesale car marketplace needs a distinctive look, not Bootstrap-adjacent components.
- Chakra UI — lower community momentum compared to shadcn as of 2025.
- Mantine — solid but adds weight without clear benefit given shadcn/ui covers the same ground.

---

### Forms & Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React Hook Form | 7.x | Form state management | Uncontrolled inputs = minimal re-renders. Standard pairing with shadcn/ui. |
| Zod | 3.x | Schema validation, shared client/server | Validate form inputs client-side AND revalidate in Server Actions. Single source of truth for data shapes. |

**Confidence:** HIGH — React Hook Form + Zod + shadcn is the canonical 2024-2025 Next.js App Router form pattern.

---

### Search & Filtering

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase PostgREST (via JS client) | managed | Listing search and filter queries | PostgreSQL full-text search (`tsvector`) is sufficient for MVP: make/model/year/VIN search. No separate search service needed at this scale. |

**Confidence:** HIGH — Supabase's PostgREST layer exposes PostgreSQL's full-text search. For MVP inventory volumes (hundreds to low thousands of cars), this is adequate. Typesense or Algolia become relevant at tens of thousands of SKUs with complex faceting needs.

---

### Analytics & Observability

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel Analytics | managed | Page views, Web Vitals | Zero-config on Vercel. Covers the admin analytics dashboard's traffic/performance data. |
| `@vercel/analytics` | 1.x | Analytics integration package | Add `<Analytics />` component to root layout. |
| Sentry | 8.x | Error tracking | Next.js 15's `onRequestError` instrumentation hook integrates cleanly. Catch Stripe webhook failures and signing callback errors before users report them. |
| `@sentry/nextjs` | 8.x | Sentry SDK for Next.js | Auto-instruments Server Components, Server Actions, and API routes. |

**Confidence:** MEDIUM — Vercel Analytics is first-party and zero-config. Sentry is the standard choice for Next.js error tracking; version 8.x current as of my training data.

---

### Email

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Resend | current | Transactional email | Purchase confirmations, document signing reminders, admin notifications. React Email + Resend is the standard 2024-2025 Next.js pairing — write emails as React components. |
| `resend` | 3.x | Resend Node SDK | |
| `react-email` | 3.x | Email template authoring | |

**Confidence:** MEDIUM — Resend + React Email is the dominant pattern for new Next.js projects. SendGrid and Postmark are viable alternatives. Resend's API design is cleaner for this use case.

---

### Dev Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ESLint | 9.x | Linting | Next.js 15 includes ESLint 9 support. Use the flat config format. |
| Prettier | 3.x | Code formatting | Standard; configure with `prettier-plugin-tailwindcss` to auto-sort class names. |
| `prettier-plugin-tailwindcss` | 0.6x | Tailwind class sorting | Eliminates class order debates in code review. |
| `@types/node` | 20.x | Node type definitions | |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| E-signing | Dropbox Sign | DocuSign | DocuSign API is enterprise-priced, complex to integrate for a startup. DX is significantly worse. |
| E-signing | Dropbox Sign | Docuseal (OSS) | Strong alternative if per-envelope pricing matters. Evaluate before committing. |
| UI System | shadcn/ui + Tailwind | Material UI | MUI design language conflicts with high-quality automotive brand feel; fights customization. |
| Payment | Stripe Checkout | Stripe Payment Element | Checkout is simpler for high-value single purchases; trust signal advantage; less PCI scope. |
| Image storage | Supabase Storage | Cloudinary | Adds cost and dependency; Supabase handles the car photo scale for MVP. |
| Search | Supabase PostgREST FTS | Algolia / Typesense | Overkill for MVP; adds operational cost. Revisit at scale. |
| Email | Resend | SendGrid | SendGrid API has more friction; Resend + React Email DX is superior for Next.js. |
| DB | Supabase (PostgreSQL) | PlanetScale / Neon | Stack is constrained; Supabase is correct. |

---

## Installation

```bash
# Core
npm install next@latest react@latest react-dom@latest typescript @types/react @types/react-dom @types/node

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Stripe
npm install stripe @stripe/stripe-js @stripe/react-stripe-js

# E-signing + PDF
npm install @hellosign/node-sdk pdf-lib

# Forms + Validation
npm install react-hook-form zod @hookform/resolvers

# UI
npm install tailwindcss @tailwindcss/forms lucide-react framer-motion
npx shadcn@latest init

# Email
npm install resend react-email @react-email/components

# Analytics / Observability
npm install @vercel/analytics @sentry/nextjs

# Dev
npm install -D prettier prettier-plugin-tailwindcss eslint eslint-config-next
```

---

## Version Verification Required

Before starting development, verify these versions with `npm info [pkg] version` — my training data cutoff is August 2025, and package versions change:

- `stripe` (Node SDK) — was 16.x, may have moved to 17+
- `@stripe/stripe-js` — was 4.x
- `@hellosign/node-sdk` — was 7.x; confirm the package name hasn't changed post-Dropbox rebranding
- `framer-motion` — was 11.x; Motion (rebranded) may have released a new major
- `react-email` — fast-moving, verify latest major
- `tailwindcss` — 4.x config syntax changed significantly from 3.x; confirm `@tailwindcss/vite` or PostCSS plugin version

---

## Sources

- Next.js 15 release: https://nextjs.org/blog/next-15 (confirmed Oct 2024, stable)
- Supabase SSR docs: https://supabase.com/docs/guides/auth/server-side/nextjs (training data — `@supabase/ssr` package)
- Stripe Checkout vs Payment Element tradeoffs: Stripe official docs (training data)
- Tailwind CSS 4.0: https://tailwindcss.com (training data — v4 released early 2025)
- shadcn/ui: https://ui.shadcn.com (training data — copy-paste model confirmed)
- Dropbox Sign (HelloSign) API: https://developers.hellosign.com (training data)
- Resend + React Email: https://resend.com/docs (training data)
