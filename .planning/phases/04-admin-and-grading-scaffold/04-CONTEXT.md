# Phase 4: Admin and Grading Scaffold - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can fully manage the platform — creating wholesaler accounts, viewing/disabling users, monitoring all listings and orders, and viewing analytics. The grading scaffold callback endpoint is deployed, validates an API key, and writes grades to listings — the GradeBadge component displays real grades when populated.

Admin panel is a new route group with its own layout. Consumer storefront and seller dashboard are unchanged.

</domain>

<decisions>
## Implementation Decisions

### Admin panel layout
- Sidebar navigation with icon+label links: Dashboard, Users, Listings, Orders
- Separate route group `app/(admin)/` with its own `layout.tsx` — completely independent from public and seller layouts
- Desktop-only — no mobile responsiveness needed for the admin panel
- Dark theme consistent with rest of app (`bg-zinc-950 text-zinc-50`)

### Data views (listings & orders)
- Data tables with status filter tabs (not card grids)
- Listings: filter tabs for All / Draft / Active / Sold — columns: Vehicle, Seller, Price, Status
- Orders: filter tabs for All / Paid / Signing / Complete — columns: Order #, Vehicle, Buyer, Amount, Status, Date
- Click row for detail (Claude's discretion on detail level)

### Account management
- Wholesaler creation form: Business Name, Email, Password — admin sets password directly and shares credentials offline
- Uses `supabase.auth.admin.createUser()` with `email_confirm: true` and `app_metadata: { role: 'wholesaler' }`
- Single unified user table showing all roles with filter tabs: All / Consumers / Wholesalers
- Columns: Email, Role, Status (Active/Banned), Created
- Disable = Supabase ban via `auth.admin.updateUserById(id, { ban_duration })` — reversible toggle
- Inline row actions only (Disable/Enable toggle) — no separate user detail page

### Analytics dashboard
- Dashboard is the admin landing page (`/admin` → dashboard)
- 4 summary stat cards showing all-time totals: Revenue, Listings (with active count), Orders, Users (with seller count)
- No time-range selectors or charts — simple aggregate queries
- Recent orders feed below stat cards — 5 most recent orders with vehicle, amount, and time ago

### Grading callback endpoint
- `POST /api/grading/callback` — API key auth via `x-api-key` header validated against `GRADING_API_KEY` env var
- Request body includes VIN and grade — endpoint looks up listing by VIN and updates grade, grade_source, graded_at columns
- Response: 200 with updated listing ID on success, 401 for bad key, 404 for VIN not found, 400 for invalid payload

### Grade display
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx` — Card with CardHeader/CardContent/CardFooter — use for stat cards on dashboard
- `components/ui/GradeBadge.tsx` — already renders grade or "Pending" — update to handle real grade values with color coding
- `lib/supabase/admin.ts` — `createAdminClient()` with service_role — use for all admin operations (user creation, banning, grade writes)
- `lib/supabase/server.ts` — server client for authenticated queries — use for admin data fetching
- `components/ui/button.tsx`, `input.tsx`, `form.tsx` — shadcn form components for wholesaler creation form
- `lib/validations/` — Zod schema pattern — create `admin.ts` for admin form validation

### Established Patterns
- Server Actions for mutations (`app/actions/listings.ts`, `app/actions/orders.ts`) — create `app/actions/admin.ts`
- Dark theme: `bg-zinc-950 text-zinc-50` — admin panel must match
- Route groups: `(public)`, `(seller)` — admin follows same pattern as `(admin)`
- RLS policies already grant admin read access to all tables via `get_my_role() = 'admin'`

### Integration Points
- `middleware.ts` — `/admin` route already redirected if not logged in, but needs admin role verification (currently only checks auth, not role)
- DB schema: `listings.grade`, `listings.grade_source`, `listings.graded_at` columns exist (nullable, migration 002)
- DB schema: `orders` table with `status`, `stripe_payment_id`, `total_amount` — queryable for analytics
- DB schema: `profiles` table with `role` column — queryable for user management
- Supabase auth admin API — `auth.admin.listUsers()`, `auth.admin.createUser()`, `auth.admin.updateUserById()`

</code_context>

<specifics>
## Specific Ideas

- Dashboard stat cards should give a quick pulse check — admin sees the numbers and recent orders immediately
- User management is lean for v1 — just a table with inline toggle, no complex user profiles
- Tables with filter tabs match the established pattern from the seller dashboard (Published/Drafts sections)
- Grading callback is a scaffold — designed for an external AI service that doesn't exist yet

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 scope

</deferred>

---

*Phase: 04-admin-and-grading-scaffold*
*Context gathered: 2026-03-10*
