# Phase 04: Admin and Grading Scaffold - Research

**Researched:** 2026-03-10
**Domain:** Next.js App Router admin panel, Supabase Auth Admin API, API route security
**Confidence:** HIGH

## Summary

Phase 4 builds an admin panel as a new route group (`app/(admin)/`) with a sidebar layout and four views: Dashboard (analytics), Users (create/disable), Listings (filter table), and Orders (filter table). It also deploys the grading callback endpoint (`POST /api/grading/callback`) that the future AI service will call.

All foundation work is already in place. RLS policies for admin access exist on every table. `createAdminClient()` with `service_role` is available for privileged operations. The `profiles` table stores roles. The `listings` table already has `grade`, `grade_source`, and `graded_at` columns. The `GradeBadge` component already renders a real grade when the prop is non-null. Middleware already checks auth for `/admin` but does NOT yet check for the admin role.

The primary implementation challenge is the admin role check in middleware — currently only `startsWith('/admin')` is guarded by auth, not role. The grading callback requires a new `GRADING_API_KEY` env var and a lookup-by-VIN update pattern that uses the admin client (bypasses RLS).

**Primary recommendation:** Build admin panel as a pure RSC data-fetching layer using `createAdminClient()` for all queries and mutations, with Server Actions in `app/actions/admin.ts` for mutations (create user, ban/unban, grade write). Do not add client-side state management — filter tabs can be URL search params driving RSC re-renders.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin panel layout:**
- Sidebar navigation with icon+label links: Dashboard, Users, Listings, Orders
- Separate route group `app/(admin)/` with its own `layout.tsx` — completely independent from public and seller layouts
- Desktop-only — no mobile responsiveness needed for the admin panel
- Dark theme consistent with rest of app (`bg-zinc-950 text-zinc-50`)

**Data views (listings & orders):**
- Data tables with status filter tabs (not card grids)
- Listings: filter tabs for All / Draft / Active / Sold — columns: Vehicle, Seller, Price, Status
- Orders: filter tabs for All / Paid / Signing / Complete — columns: Order #, Vehicle, Buyer, Amount, Status, Date
- Click row for detail (Claude's discretion on detail level)

**Account management:**
- Wholesaler creation form: Business Name, Email, Password — admin sets password directly and shares credentials offline
- Uses `supabase.auth.admin.createUser()` with `email_confirm: true` and `app_metadata: { role: 'wholesaler' }`
- Single unified user table showing all roles with filter tabs: All / Consumers / Wholesalers
- Columns: Email, Role, Status (Active/Banned), Created
- Disable = Supabase ban via `auth.admin.updateUserById(id, { ban_duration })` — reversible toggle
- Inline row actions only (Disable/Enable toggle) — no separate user detail page

**Analytics dashboard:**
- Dashboard is the admin landing page (`/admin` → dashboard)
- 4 summary stat cards showing all-time totals: Revenue, Listings (with active count), Orders, Users (with seller count)
- No time-range selectors or charts — simple aggregate queries
- Recent orders feed below stat cards — 5 most recent orders with vehicle, amount, and time ago

**Grading callback endpoint:**
- `POST /api/grading/callback` — API key auth via `x-api-key` header validated against `GRADING_API_KEY` env var
- Request body includes VIN and grade — endpoint looks up listing by VIN and updates grade, grade_source, graded_at columns
- Response: 200 with updated listing ID on success, 401 for bad key, 404 for VIN not found, 400 for invalid payload

**Grade display:**
- Existing GradeBadge component already shows "Grade Pending" — when grade column is populated, display actual grade value with colored badge
- Grade displays everywhere: listing cards (storefront), listing cards (admin table), vehicle detail page
- No UI redesign — just the badge content changes from placeholder to real value

### Claude's Discretion
- Exact sidebar styling and icon choices
- Table pagination approach and page sizes
- Admin middleware role check implementation details
- Order/listing detail views within admin panel
- Stat card styling and layout
- Recent orders feed formatting
- Error states and loading states throughout admin panel

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 4 scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADMIN-01 | Admin can create wholesale partner accounts (set email, password, role) | Supabase `auth.admin.createUser()` with `email_confirm: true` and `app_metadata: { role: 'wholesaler' }` — covered by admin client pattern |
| ADMIN-02 | Admin can view and disable user accounts | `auth.admin.listUsers()` for the user table; `auth.admin.updateUserById(id, { ban_duration: '876000h' })` to ban, `{ ban_duration: 'none' }` to unban — admin client pattern established |
| ADMIN-03 | Admin can view all listings with status filter (draft, active, sold) | RLS policy `admins_full_access_listings` already exists; query `listings` with `.eq('status', filter)` or all statuses — use `createAdminClient()` |
| ADMIN-04 | Admin can view all orders with status filter | RLS policy `admins_full_access_orders` already exists; join orders with listings for vehicle name and profiles for buyer email |
| ADMIN-05 | Admin can view analytics dashboard showing revenue, listing count, and order count | Aggregate queries on orders (sum price_cents), listings (count by status), profiles (count by role) — all via admin client |
| GRADE-04 | /api/grading/callback endpoint is scaffolded and ready to receive grade results | New Route Handler `app/api/grading/callback/route.ts`; API key from env var; lookup listing by VIN; write grade/grade_source/graded_at — admin client bypasses RLS |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | current (project) | Route group, RSC data fetching, Route Handlers | Already in use; admin panel is another route group |
| @supabase/supabase-js | current (project) | `createAdminClient()` for admin ops, `auth.admin.*` | Already in `lib/supabase/admin.ts`; service_role bypasses RLS |
| zod | current (project) | Schema validation for grading callback body and user creation form | Already in `lib/validations/`; follow existing pattern |
| react-hook-form | current (project) | Wholesaler creation form (email, password, business name) | Used in Phase 2 listing forms |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | current (project) | Sidebar icons | Claude's discretion; project likely already has this as shadcn dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| URL search params for filter tabs | Client state (useState) | URL params enable RSC re-render, shareable URLs, no JS required — prefer this |
| `createAdminClient()` for admin queries | `createClient()` with admin session | Admin client (service_role) is more reliable, bypasses RLS completely — correct choice for server-side admin |

**Installation:** No new packages needed. All required libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
app/
├── (admin)/
│   ├── layout.tsx           # Sidebar layout, admin role guard
│   ├── admin/
│   │   ├── page.tsx         # Dashboard (redirect or dashboard content)
│   │   ├── users/
│   │   │   └── page.tsx     # User table with filter tabs + create form
│   │   ├── listings/
│   │   │   └── page.tsx     # Listings table with status filter tabs
│   │   └── orders/
│   │       └── page.tsx     # Orders table with status filter tabs
├── api/
│   └── grading/
│       └── callback/
│           └── route.ts     # POST handler — API key auth + grade write
app/
└── actions/
    └── admin.ts             # createWholesaler, banUser, unbanUser Server Actions

lib/
└── validations/
    └── admin.ts             # Zod schemas: createWholesalerSchema, gradingCallbackSchema
```

### Pattern 1: RSC Filter Tabs via URL Search Params
**What:** Filter tabs are `<Link>` elements that add `?status=active` to the URL. The page component reads `searchParams` and passes the filter to the query. No client-side state.
**When to use:** All admin data tables (listings, orders, users).
**Example:**
```typescript
// app/(admin)/admin/listings/page.tsx
export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = createAdminClient()
  let query = supabase
    .from('listings')
    .select('id, make, model, year, price_cents, status, seller_id, created_at, profiles!inner(company)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: listings } = await query
  // ...
}
```

### Pattern 2: Admin Layout with Role Guard
**What:** The `(admin)/layout.tsx` fetches the user's session and checks `app_metadata.role`. If not admin, redirect to `/`. Sidebar is rendered here.
**When to use:** Single layout file that wraps all admin pages.
**Example:**
```typescript
// app/(admin)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.app_metadata?.role
  if (role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
      <aside className="w-56 border-r border-zinc-800 flex-shrink-0">
        {/* sidebar nav */}
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

Note: The middleware at `middleware.ts` currently only checks auth (not role) for `/admin`. The layout guard is the primary role enforcement. The middleware can also be updated to check role for defense in depth — but reading `app_metadata.role` from the JWT in middleware is already available via `user.app_metadata?.role` since the custom access token hook injects it.

### Pattern 3: Supabase Auth Admin API
**What:** `createAdminClient()` (service_role) exposes `supabase.auth.admin.*` for privileged user operations.
**When to use:** Creating wholesalers, listing all users, banning/unbanning.
**Example:**
```typescript
// Creating a wholesaler
const admin = createAdminClient()
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: 'wholesaler' },
  user_metadata: { company: businessName },
})
// Trigger handle_new_user will insert profiles row with role='wholesaler'

// Listing all users (paginated)
const { data: { users }, error } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 50,
})

// Banning a user
await admin.auth.admin.updateUserById(userId, {
  ban_duration: '876000h', // ~100 years = effectively permanent
})

// Unbanning
await admin.auth.admin.updateUserById(userId, {
  ban_duration: 'none',
})
```

### Pattern 4: Grading Callback Route Handler
**What:** API route validates API key from header, parses + validates body, looks up listing by VIN, writes grade.
**When to use:** `POST /api/grading/callback`
**Example:**
```typescript
// app/api/grading/callback/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const schema = z.object({
  vin: z.string().length(17),
  grade: z.string().min(1).max(10),
  grade_source: z.enum(['ai', 'manual']).optional().default('ai'),
})

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.GRADING_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { vin, grade, grade_source } = parsed.data
  const admin = createAdminClient()

  const { data: listing, error: findError } = await admin
    .from('listings')
    .select('id')
    .eq('vin', vin)
    .single()

  if (findError || !listing) {
    return Response.json({ error: 'Listing not found for VIN' }, { status: 404 })
  }

  const { error: updateError } = await admin
    .from('listings')
    .update({
      grade,
      grade_source,
      graded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', listing.id)

  if (updateError) {
    return Response.json({ error: 'Failed to write grade' }, { status: 500 })
  }

  return Response.json({ listing_id: listing.id }, { status: 200 })
}
```

### Pattern 5: Analytics Aggregate Queries
**What:** Server-side aggregate queries using Supabase RPC or chained queries. No chart library — just numbers.
**When to use:** Dashboard stat cards.
**Example:**
```typescript
// Revenue: sum of price_cents for completed orders
const { data: revenueData } = await admin
  .from('orders')
  .select('price_cents')
  .in('status', ['documents_signed', 'complete'])

const totalRevenue = revenueData?.reduce((sum, o) => sum + o.price_cents, 0) ?? 0

// Listing counts by status
const { count: totalListings } = await admin
  .from('listings')
  .select('*', { count: 'exact', head: true })

const { count: activeListings } = await admin
  .from('listings')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active')

// User counts
const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1 })
// Note: auth.admin.listUsers returns total count in metadata
```

### Anti-Patterns to Avoid
- **Client-side data fetching for admin tables:** Admin pages are desktop-only, data-heavy, and benefit from RSC caching. Use Server Components with `createAdminClient()` directly.
- **Using `createClient()` (anon key) for admin operations:** `createClient()` uses the user's session + RLS. `createAdminClient()` (service_role) bypasses RLS entirely — required for cross-user queries.
- **Storing `GRADING_API_KEY` with `NEXT_PUBLIC_` prefix:** Must be server-only. Never expose in client bundle.
- **Trusting `role` from request body for user creation:** Role must be set via `app_metadata` in `createUser()` call, never from client input.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User listing from Supabase Auth | Manual join of auth.users + profiles | `admin.auth.admin.listUsers()` | Direct auth API returns user + app_metadata (ban_duration, etc.) in one call |
| Password hashing for wholesaler accounts | Custom bcrypt logic | `admin.auth.admin.createUser({ password })` | Supabase Auth handles password storage — never touch plaintext passwords |
| Ban persistence | Manual `banned` column | `auth.admin.updateUserById(id, { ban_duration })` | Supabase native ban propagates to JWT validation automatically |
| API key comparison timing attacks | `===` string compare | `crypto.timingSafeEqual()` or constant-time compare | Not critical for internal API but worth using standard approach |

**Key insight:** Supabase Auth Admin API handles all user lifecycle operations. Do not duplicate user state in the `profiles` table (it already mirrors role, but ban state lives in Auth only).

## Common Pitfalls

### Pitfall 1: `auth.admin.listUsers()` vs `profiles` table for user display
**What goes wrong:** Building user table from `profiles` misses ban state. Auth Admin API returns the `banned_until` field; profiles table does not.
**Why it happens:** Developers reach for the familiar Supabase client `.from('profiles')` pattern.
**How to avoid:** Use `admin.auth.admin.listUsers()` as the data source for the Users admin page. Join with profiles only if you need `company` name.
**Warning signs:** User table shows no ban status, or ban toggle has no effect on UI display.

### Pitfall 2: Middleware role check gap
**What goes wrong:** A non-admin user who knows the `/admin` URL can access it — middleware only checks auth, not role.
**Why it happens:** The existing middleware (line 44-47) only checks `!user` for `/admin`, not `user.app_metadata?.role === 'admin'`.
**How to avoid:** Add role check to middleware AND enforce in layout — defense in depth. Both are cheap checks against the JWT (no DB query).
**Warning signs:** Wholesaler or consumer accounts can navigate to `/admin` without redirect.

### Pitfall 3: `handle_new_user` trigger and `app_metadata` for wholesaler creation
**What goes wrong:** Wholesaler profile row gets `role: 'consumer'` instead of `role: 'wholesaler'` if `app_metadata` is not set correctly.
**Why it happens:** The trigger reads `NEW.raw_app_meta_data ->> 'role'`. If `createUser()` sets `user_metadata` instead of `app_metadata`, trigger falls back to 'consumer'.
**How to avoid:** Use `app_metadata: { role: 'wholesaler' }` (not `user_metadata`) in `createUser()` call.
**Warning signs:** Created user can log in but cannot access seller dashboard (role check fails).

### Pitfall 4: `listUsers()` pagination for analytics user count
**What goes wrong:** `auth.admin.listUsers()` is paginated — `.listUsers({ perPage: 1 })` returns the total count in the response metadata, not all users.
**Why it happens:** Developers try to count array length but get only the first page.
**How to avoid:** Use the `total` field from the `listUsers()` response for counts. For role-breakdown (consumers vs wholesalers), query `profiles` table instead (simpler SQL aggregate).
**Warning signs:** User count on dashboard shows wrong number.

### Pitfall 5: VIN uniqueness in grading callback
**What goes wrong:** Listing lookup by VIN fails if VIN was stored differently (case mismatch), or returns wrong listing if multiple listings share a VIN (shouldn't happen — UNIQUE constraint).
**Why it happens:** VIN has a UNIQUE constraint in the schema but is stored as-is.
**How to avoid:** Normalize VIN to uppercase in the grading callback before lookup. The `listings.vin` column has a `UNIQUE` constraint (migration 002) so duplicate VINs are already prevented.
**Warning signs:** 404 responses even when VIN exists in the database.

### Pitfall 6: Filter tabs and RSC searchParams in Next.js 15
**What goes wrong:** `searchParams` in Next.js 15 App Router is a Promise — must be `await`ed before reading.
**Why it happens:** Next.js 15 changed `searchParams` and `params` to be async.
**How to avoid:** `const { status } = await searchParams` — the project already does this in other pages.
**Warning signs:** TypeScript errors on searchParams property access, or params returning undefined.

## Code Examples

Verified patterns from existing codebase:

### Server Action pattern (from app/actions/listings.ts)
```typescript
'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createWholesalerAction(
  data: CreateWholesalerInput
): Promise<{ success: true; userId: string } | { error: string }> {
  // Verify caller is admin (defense in depth — layout also checks)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const admin = createAdminClient()
  const { data: newUser, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    app_metadata: { role: 'wholesaler' },
    user_metadata: { company: data.businessName },
  })

  if (error) return { error: error.message }
  return { success: true, userId: newUser.user.id }
}
```

### Zod validation schema pattern (from lib/validations/listing.ts)
```typescript
// lib/validations/admin.ts
import { z } from 'zod'

export const createWholesalerSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const gradingCallbackSchema = z.object({
  vin: z.string().length(17, 'VIN must be exactly 17 characters'),
  grade: z.string().min(1).max(10),
  grade_source: z.enum(['ai', 'manual']).default('ai'),
})

export type CreateWholesalerInput = z.infer<typeof createWholesalerSchema>
export type GradingCallbackInput = z.infer<typeof gradingCallbackSchema>
```

### GradeBadge already handles real grades
```typescript
// components/ui/GradeBadge.tsx (existing — no changes needed for GRADE-04)
// When grade is non-null string, renders blue badge with "Grade: {grade}"
// When grade is null/undefined, renders "Grade Pending" placeholder
// The component is already correct — GRADE-04 just ensures the DB column gets populated
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pages/api/` Route Handlers | `app/api/*/route.ts` Route Handlers | Next.js 13 App Router | Grading callback must use `export async function POST(request: Request)` pattern |
| `searchParams` as sync object | `searchParams` as `Promise<{...}>` | Next.js 15 | All page components receiving searchParams must `await` them |
| Supabase `auth.admin.listUsers()` returns array | Same API, but pagination is via `{ page, perPage }` and total is in response | Stable | Use `total` from response for user count on dashboard |

## Open Questions

1. **Middleware role check scope**
   - What we know: Middleware currently checks only auth (not role) for `/admin`. Layout will enforce role.
   - What's unclear: Whether to also add role check in middleware for defense in depth.
   - Recommendation: Yes — add `user.app_metadata?.role !== 'admin'` check to middleware for `/admin` routes. This is a cheap JWT read (no DB query). Claude's discretion per CONTEXT.md.

2. **`auth.admin.listUsers()` for user table display**
   - What we know: The API is paginated and returns auth-level data (ban status, email confirmed).
   - What's unclear: Whether `profiles.company` needs to be joined for the user table (company name per CONTEXT.md column spec).
   - Recommendation: Fetch users from `auth.admin.listUsers()`, then fetch matching profiles from DB for company data. Or: fetch profiles and cross-reference. Given small expected user count (v1 wholesale platform), N+1 is acceptable or fetch all profiles in one query.

3. **Order status filter values**
   - What we know: Orders table has statuses: `pending_payment`, `paid`, `documents_sent`, `documents_signed`, `complete`, `cancelled`, `refunded`.
   - What's unclear: CONTEXT.md specifies tabs "All / Paid / Signing / Complete" — "Signing" maps to `documents_sent` status.
   - Recommendation: Tab filter map: All → no filter, Paid → `paid`, Signing → `documents_sent`, Complete → `documents_signed,complete`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured in vitest.config.ts) |
| Config file | `/Users/sickle/Coding/Coast/vitest.config.ts` |
| Quick run command | `npx vitest run tests/admin/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-01 | `createWholesalerAction` creates user with correct role in app_metadata | unit | `npx vitest run tests/admin/create-wholesaler.test.ts` | Wave 0 |
| ADMIN-02 | `banUserAction` / `unbanUserAction` call correct Supabase admin API | unit | `npx vitest run tests/admin/user-management.test.ts` | Wave 0 |
| ADMIN-03 | Listings query returns all statuses; status filter filters correctly | unit | `npx vitest run tests/admin/admin-queries.test.ts` | Wave 0 |
| ADMIN-04 | Orders query returns all orders; status filter filters correctly | unit | `npx vitest run tests/admin/admin-queries.test.ts` | Wave 0 |
| ADMIN-05 | Analytics queries compute correct aggregates | unit | `npx vitest run tests/admin/analytics.test.ts` | Wave 0 |
| GRADE-04 | Callback returns 401 for missing/bad key; 400 for invalid payload; 404 for VIN not found; 200 + grade written on success | unit | `npx vitest run tests/admin/grading-callback.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/admin/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/admin/grading-callback.test.ts` — covers GRADE-04 (follows webhook-stripe.test.ts mock pattern)
- [ ] `tests/admin/create-wholesaler.test.ts` — covers ADMIN-01
- [ ] `tests/admin/user-management.test.ts` — covers ADMIN-02
- [ ] `tests/admin/admin-queries.test.ts` — covers ADMIN-03 and ADMIN-04
- [ ] `tests/admin/analytics.test.ts` — covers ADMIN-05

All test files require mocking `@/lib/supabase/admin` (same pattern as `webhook-stripe.test.ts`). No new test infrastructure needed — vitest config already picks up `tests/**/*.test.ts`.

## Sources

### Primary (HIGH confidence)
- Existing codebase — read directly: `lib/supabase/admin.ts`, `middleware.ts`, `supabase/migrations/001_profiles_and_hook.sql`, `supabase/migrations/002_schema.sql`
- Existing test patterns — read directly: `tests/transactions/webhook-stripe.test.ts`, `tests/storefront/grade-badge.test.ts`
- Existing action patterns — read directly: `app/actions/listings.ts`, `app/actions/orders.ts`
- Existing layout patterns — read directly: `app/(seller)/layout.tsx`
- CONTEXT.md decisions — read directly

### Secondary (MEDIUM confidence)
- Supabase Auth Admin API (`auth.admin.createUser`, `listUsers`, `updateUserById`) — verified against known project usage of `createAdminClient()` with service_role key

### Tertiary (LOW confidence)
- None — all findings verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use in this project; no new dependencies
- Architecture: HIGH — follows established route group, RSC, and server action patterns already in codebase
- Pitfalls: HIGH — identified from direct code inspection (middleware gap, trigger app_metadata requirement)
- Test patterns: HIGH — matches exact mock structure from existing webhook test

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable stack; Next.js App Router and Supabase Auth Admin API are not in active churn)
