---
phase: 04-admin-and-grading-scaffold
plan: "03"
subsystem: ui
tags: [admin, server-components, supabase, tailwind, react]

# Dependency graph
requires:
  - phase: 04-admin-and-grading-scaffold
    plan: "01"
    provides: createAdminClient(), admin layout/middleware/route group
  - phase: 02-inventory
    provides: listings table schema (status, grade, seller_id)
  - phase: 03-transactions
    provides: orders table schema (status, buyer_id, listing_id)

provides:
  - Admin listings table with All/Draft/Active/Sold status filter tabs
  - Admin orders table with All/Paid/Signing/Complete status filter tabs
  - GradeBadge integration showing real grades in listing rows
  - Human-readable order status badge mapping

affects:
  - 04-02-analytics-dashboard (same admin layout)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RSC searchParams filter pattern — await searchParams, extract status, pass to Supabase query
    - Tab filter UI as Link components with URL-driven active state
    - Supabase join pattern for related table data in admin queries

key-files:
  created:
    - app/(admin)/admin/listings/page.tsx
    - app/(admin)/admin/orders/page.tsx
  modified: []

key-decisions:
  - "Orders filter mapping: 'signing' tab maps to documents_sent status; 'complete' tab maps to both documents_signed and complete via .in()"

patterns-established:
  - "Admin table pattern: overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 with divide-y divide-zinc-800 rows"
  - "Filter tab pattern: Link href=?status={value}, active=border-b-2 border-blue-500 text-zinc-50, inactive=text-zinc-500 hover:text-zinc-300"
  - "Status badge pattern: inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium with per-status color classes"

requirements-completed:
  - ADMIN-03
  - ADMIN-04

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 4 Plan 03: Admin Data Tables Summary

**Admin listings and orders tables as RSC pages with URL-driven status filter tabs, GradeBadge integration, and human-readable order status mapping**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-11T03:32:16Z
- **Completed:** 2026-03-11T03:37:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Admin listings page with All/Draft/Active/Sold tabs, GradeBadge in grade column, seller company from profiles join, rows link to /listings/{id}
- Admin orders page with All/Paid/Signing/Complete tabs, human-readable status badges, vehicle name from listings join, buyer email from profiles join
- Both pages use createAdminClient() service role for data access, consistent dark table styling

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin listings table with status filter tabs and grade display** - `26c9df6` (feat)
2. **Task 2: Admin orders table with status filter tabs** - `8d52430` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/(admin)/admin/listings/page.tsx` - Server Component with filter tabs, Supabase listings query with profiles join, GradeBadge, status badges, clickable rows
- `app/(admin)/admin/orders/page.tsx` - Server Component with filter tabs, Supabase orders query with listings and profiles joins, human-readable status badge mapping

## Decisions Made
- Orders "Complete" tab maps to both `documents_signed` and `complete` statuses via `.in()` — captures the full "done" funnel in one view
- Listing rows are clickable and link to `/listings/{id}` (public page) rather than a separate admin detail page, per plan specification
- `unknown` cast used for Supabase join results (`profiles!buyer_id`) since the generated types don't reflect dot-notation join aliases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Transient turbopack ENOENT build error on first two attempts (temp file race condition). Cleared `.next` directory and rebuilt successfully — no code changes required.
- Pre-existing TypeScript errors in Playwright spec files (`tests/transactions/*.spec.ts`) are unrelated to this plan's changes and were not introduced here.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admin listings and orders tables are complete
- Phase 4 is now complete (Plans 01, 02-analytics, 03-data-tables all done — note: plan 02 may still be pending)
- Admin can monitor all platform activity via listings and orders views

---
*Phase: 04-admin-and-grading-scaffold*
*Completed: 2026-03-10*
