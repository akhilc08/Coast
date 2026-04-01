# Codebase Structure

**Analysis Date:** 2026-04-01

## Directory Layout

```
Coast/
├── app/                        # Next.js App Router root
│   ├── (admin)/                # Route group: admin portal (role = admin)
│   │   ├── admin/
│   │   │   ├── listings/       # Admin listing management
│   │   │   ├── orders/         # Admin order management
│   │   │   ├── settings/       # Admin settings
│   │   │   └── users/          # User management (ban, create wholesaler)
│   │   ├── AdminNav.tsx        # Sidebar nav component (co-located)
│   │   └── layout.tsx          # Admin shell layout with auth guard
│   ├── (public)/               # Route group: buyer-facing storefront
│   │   ├── account/            # Authenticated buyer account
│   │   │   └── orders/[orderId]/ # Order detail + document download
│   │   ├── checkout/
│   │   │   └── [listingId]/transport/ # Transport address collection
│   │   ├── inventory/          # Full browseable inventory with filters
│   │   ├── listings/[id]/      # Single listing detail page
│   │   ├── sellers/            # Seller directory + [id] profile pages
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── page.tsx            # Homepage (hero, featured listings)
│   │   └── layout.tsx          # Public shell with top nav
│   ├── (seller)/               # Route group: seller portal (role = wholesaler|admin)
│   │   ├── seller/
│   │   │   ├── dashboard/      # Seller listing overview
│   │   │   ├── listings/
│   │   │   │   ├── [id]/edit/  # Edit published listing
│   │   │   │   └── new/        # Multi-step listing creation wizard
│   │   │   └── profile/        # Seller bio and profile editor
│   │   └── layout.tsx          # Seller shell layout with auth guard
│   ├── actions/                # Next.js Server Actions (all mutations)
│   │   ├── admin.ts
│   │   ├── checkout.ts
│   │   ├── listings.ts
│   │   ├── orders.ts
│   │   ├── profile.ts
│   │   ├── reviews.ts
│   │   └── transport.ts
│   ├── api/                    # Route Handlers (webhooks + AI endpoint)
│   │   ├── condition/extract/route.ts   # Claude AI PDF extraction
│   │   ├── contact/route.ts
│   │   ├── grading/callback/route.ts
│   │   └── webhooks/
│   │       ├── dropboxsign/route.ts
│   │       └── stripe/route.ts
│   ├── auth/                   # Supabase auth callback routes
│   │   ├── callback/route.ts
│   │   ├── confirm/route.ts
│   │   └── reset-password/page.tsx
│   ├── globals.css
│   └── layout.tsx              # Root layout (fonts, providers, analytics)
├── components/                 # Shared React components
│   ├── admin/                  # Admin-specific components
│   ├── auth/                   # Login, signup, password reset forms
│   ├── checkout/               # TransportForm
│   ├── listings/               # Listing display + wizard
│   │   └── wizard/             # Multi-step listing creation wizard
│   ├── reviews/                # Review cards, forms, star rating
│   ├── seller/                 # Seller profile components
│   ├── storefront/             # Browsing UI (ListingCard, filters, search)
│   └── ui/                     # shadcn/ui base components
├── lib/                        # Server-side utilities and integrations
│   ├── email/                  # React Email templates
│   ├── pdf/                    # PDF generation (jsPDF or similar)
│   ├── queries/                # Read-only Supabase query functions
│   ├── supabase/               # Three Supabase client factories
│   │   ├── admin.ts            # Service-role client (bypasses RLS)
│   │   ├── browser.ts          # Browser client
│   │   └── server.ts           # SSR client (respects RLS)
│   ├── transport/              # Transport provider abstraction
│   │   ├── types.ts
│   │   ├── index.ts            # getTransportProvider() factory
│   │   ├── mock-provider.ts
│   │   └── central-dispatch-provider.ts
│   ├── types/                  # Shared TypeScript types
│   │   └── condition.ts        # AiConditionData, grade enums
│   ├── utils/                  # Pure utility functions
│   ├── validations/            # Zod schemas (listing, auth, order, review, admin)
│   ├── dropboxsign.ts
│   ├── fulfillment.ts          # Post-payment pipeline orchestrator
│   ├── nhtsa.ts                # NHTSA VIN decode API
│   ├── photo-slots.ts
│   ├── resend.ts
│   ├── storage.ts
│   ├── stripe.ts
│   ├── transport-settings.ts
│   └── utils.ts                # cn() and general helpers
├── supabase/
│   └── migrations/             # SQL migration files
├── scripts/                    # Dev utility scripts
│   ├── debug-users.ts
│   └── seed-users.ts
├── tests/                      # Test files (Playwright + Vitest)
├── docs/                       # Internal documentation
├── middleware.ts               # Session refresh + route guards
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

## Directory Purposes

**`app/(public)/`:**
- Purpose: All buyer-facing pages visible to the general public
- Contains: Homepage, inventory browse, listing detail, checkout, account, auth pages
- Key files: `app/(public)/page.tsx` (homepage), `app/(public)/inventory/page.tsx`, `app/(public)/listings/[id]/page.tsx`

**`app/(seller)/`:**
- Purpose: Seller portal, gated to `wholesaler` and `admin` roles
- Contains: Dashboard, listing CRUD wizard, seller profile editor
- Key files: `app/(seller)/seller/listings/new/page.tsx` (wizard entry), `app/(seller)/seller/dashboard/page.tsx`

**`app/(admin)/`:**
- Purpose: Internal admin panel, gated to `admin` role only
- Contains: Listing review, order management, user management, settings
- Key files: `app/(admin)/admin/listings/page.tsx`, `app/(admin)/admin/users/page.tsx`

**`app/actions/`:**
- Purpose: All data mutations — the only layer that writes to the database from user requests
- Contains: One file per domain (listings, checkout, orders, admin, profile, reviews, transport)
- Key files: `app/actions/listings.ts` (create/update/publish/archive), `app/actions/checkout.ts` (Stripe session creation)

**`app/api/`:**
- Purpose: Route handlers for webhooks (Stripe, Dropbox Sign) and the AI condition extraction endpoint
- Key files: `app/api/webhooks/stripe/route.ts` (purchase fulfillment), `app/api/condition/extract/route.ts` (Claude AI)

**`lib/supabase/`:**
- Purpose: Supabase client factories — three distinct variants for different security contexts
- Rule: Use `server.ts` everywhere by default. Use `admin.ts` only for storage ops, webhook processing, or cross-user data access where RLS would incorrectly block. Never import `admin.ts` in client components.

**`lib/queries/`:**
- Purpose: Reusable read queries called from Server Components
- Key files: `lib/queries/listings.ts` (filtered/paginated listings, single listing), `lib/queries/reviews.ts` (seller rating aggregation)

**`lib/validations/`:**
- Purpose: Zod schemas defining the shape and constraints of all user input
- Pattern: Schemas are shared — imported in both Server Actions (for parsing) and client components (for form validation)

**`lib/transport/`:**
- Purpose: Pluggable transport quoting and dispatch abstraction
- Pattern: Import `getTransportProvider()` from `lib/transport/index.ts` — never import provider classes directly

**`lib/email/`:**
- Purpose: React Email component templates for transactional emails
- Contains: `order-confirmation.tsx`, `admin-order-alert.tsx`, `signing-request.tsx`, `documents-complete.tsx`

**`lib/pdf/`:**
- Purpose: PDF generation for legal documents
- Contains: `purchase-agreement.ts`, `bill-of-sale.ts`

**`components/listings/wizard/`:**
- Purpose: Multi-step listing creation wizard for sellers
- Key files: `ListingWizard.tsx` (orchestrator), `steps.ts` (step definitions), individual `Step*.tsx` files

**`components/storefront/`:**
- Purpose: Public-facing browse and search UI
- Key files: `ListingCard.tsx`, `ListingGrid.tsx`, `StorefrontFilters.tsx`, `HeroSearch.tsx`, `Pagination.tsx`

**`components/ui/`:**
- Purpose: shadcn/ui base primitives — button, card, input, label, form, separator, etc.
- Rule: Do not customize these files. Extend through wrapper components in domain subdirectories.

**`supabase/migrations/`:**
- Purpose: Versioned SQL migrations for the Supabase database schema
- Generated: No (hand-authored)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout — fonts, NuqsAdapter, Toaster, Analytics
- `middleware.ts`: Session refresh and role-based route guards
- `app/(public)/page.tsx`: Homepage

**Configuration:**
- `next.config.ts`: Next.js config — remote image patterns for Supabase storage
- `tsconfig.json`: TypeScript config — `@/` alias maps to project root
- `vitest.config.ts`: Unit test config
- `playwright.config.ts`: E2E test config
- `components.json`: shadcn/ui component config

**Core Logic:**
- `lib/fulfillment.ts`: Post-payment pipeline (PDFs + Dropbox Sign + transport dispatch)
- `app/api/webhooks/stripe/route.ts`: Purchase completion handler
- `app/actions/checkout.ts`: Stripe Checkout Session creation (vehicle + transport)
- `lib/queries/listings.ts`: Primary listing query with filter/sort/pagination

**Supabase Clients:**
- `lib/supabase/server.ts`: Use in all Server Components and Server Actions
- `lib/supabase/admin.ts`: Use only in webhooks and privileged server operations
- `lib/supabase/browser.ts`: Use in client components needing auth (e.g., file uploads)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx`
- Route handlers: `route.ts`
- React components: `PascalCase.tsx` (e.g., `ListingCard.tsx`, `BuyNowButton.tsx`)
- Server Actions files: `camelCase.ts` grouped by domain (e.g., `listings.ts`, `checkout.ts`)
- Utility/lib files: `camelCase.ts` (e.g., `fulfillment.ts`, `stripe.ts`)
- Validation files: `camelCase.ts` matching domain (e.g., `listing.ts`, `order.ts`)

**Directories:**
- Route groups: lowercase with parentheses — `(public)`, `(seller)`, `(admin)`
- Dynamic segments: `[id]`, `[listingId]`, `[orderId]`
- Component subdirectories: lowercase domain names — `storefront/`, `listings/`, `auth/`
- Lib subdirectories: lowercase domain names — `queries/`, `validations/`, `supabase/`, `transport/`

**Exports:**
- Named exports for all Server Actions (e.g., `export async function createDraftAction`)
- Named exports for query functions
- Default exports for React components and page/layout files

## Where to Add New Code

**New buyer-facing page:**
- Route: `app/(public)/[route-name]/page.tsx`
- Layout inherits from `app/(public)/layout.tsx`

**New seller page:**
- Route: `app/(seller)/seller/[route-name]/page.tsx`

**New admin page:**
- Route: `app/(admin)/admin/[route-name]/page.tsx`

**New mutation (data write):**
- Add to the relevant domain file in `app/actions/` (e.g., new listing action goes in `app/actions/listings.ts`)
- Always validate input with a Zod schema from `lib/validations/`
- Always verify `user` from `supabase.auth.getUser()` before touching data
- Return `{ success: true } | { error: string }`

**New read query:**
- Add function to `lib/queries/` in the appropriate domain file
- Call from Server Components directly — do not wrap in Server Actions

**New component:**
- Storefront/buyer UI: `components/storefront/`
- Listing-related: `components/listings/`
- Auth-related: `components/auth/`
- Base UI primitive: `components/ui/` (shadcn pattern)
- Domain-specific: create a new subdirectory under `components/`

**New Zod validation schema:**
- Add to the relevant file in `lib/validations/` (one file per domain)
- Export both the schema and the inferred TypeScript type

**New external integration:**
- Add client/wrapper to `lib/` (e.g., `lib/newservice.ts`)
- Add email template to `lib/email/` if it sends emails
- Add env var name to `.env.local.example`

**New webhook:**
- Add `route.ts` under `app/api/webhooks/[provider]/`
- Use raw `request.text()` for HMAC-verified webhooks (not `request.json()`)
- Use `createAdminClient()` — webhook context has no user session

## Special Directories

**`.planning/`:**
- Purpose: GSD planning phases, codebase analysis docs, research
- Generated: No
- Committed: Yes (planning artifacts tracked with code)

**`supabase/migrations/`:**
- Purpose: SQL migration history for the Supabase database
- Generated: Partially (via Supabase CLI)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**`.worktrees/`:**
- Purpose: Git worktrees for parallel feature branches
- Generated: Yes (via `git worktree`)
- Committed: No (local only)

---

*Structure analysis: 2026-04-01*
