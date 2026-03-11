---
phase: 04-admin-and-grading-scaffold
plan: "01"
subsystem: api
tags: [admin, grading, zod, middleware, server-actions, vitest]

# Dependency graph
requires:
  - phase: 03-transactions
    provides: createAdminClient pattern, server action pattern, Zod validation pattern

provides:
  - Zod schemas for admin operations (createWholesalerSchema, gradingCallbackSchema)
  - POST /api/grading/callback endpoint with API key auth, VIN normalization, grade writes
  - Admin route group layout with sidebar navigation and role guard
  - Middleware admin role check (defense in depth)
  - Server actions for user management (createWholesaler, banUser, unbanUser)
  - Wave 0 test stubs for admin Plans 02 and 03

affects:
  - 04-02-admin-dashboard
  - 04-03-admin-user-management

# Tech tracking
tech-stack:
  added: []
  patterns:
    - API key auth via x-api-key header validated against env var
    - VIN normalization to uppercase before DB lookup
    - requireAdmin() helper in server actions for role enforcement
    - Separate client component (AdminNav) for active link detection in RSC layout

key-files:
  created:
    - lib/validations/admin.ts
    - app/api/grading/callback/route.ts
    - app/(admin)/layout.tsx
    - app/(admin)/AdminNav.tsx
    - app/(admin)/admin/page.tsx
    - app/actions/admin.ts
    - tests/admin/grading-callback.test.ts
    - tests/admin/create-wholesaler.test.ts
    - tests/admin/user-management.test.ts
    - tests/admin/admin-queries.test.ts
    - tests/admin/analytics.test.ts
  modified:
    - middleware.ts

key-decisions:
  - "AdminNav is a separate client component — allows active link detection without making RSC layout a client component"
  - "ZodError uses .issues not .errors in this Zod version — auto-fixed TypeScript build error"

patterns-established:
  - "requireAdmin(): async helper in server actions that gets user via createClient(), checks app_metadata.role, throws on failure"
  - "Grading callback: x-api-key header auth → JSON parse → Zod validate → normalize VIN uppercase → admin client lookup → update"

requirements-completed:
  - GRADE-04

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 4 Plan 01: Admin Foundation Summary

**Grading callback endpoint with API key auth and VIN lookup, admin sidebar layout with role guard in middleware and layout, server action stubs for user management, and 7 passing tests with 17 Wave 0 stubs**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-11T03:24:51Z
- **Completed:** 2026-03-11T03:29:30Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Grading callback endpoint fully tested (7 passing) — handles all auth/validation/error paths including VIN normalization
- Admin layout with sidebar (Dashboard, Users, Listings, Orders) with active link highlighting, role guarded in both middleware and layout RSC
- Three server actions (createWholesaler, banUser, unbanUser) with requireAdmin() helper
- Wave 0 test stubs created for all admin Plans 02/03 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod schemas, grading callback endpoint, Wave 0 test stubs** - `e723b8d` (feat)
2. **Task 2: Admin layout, middleware role guard, server action stubs, dashboard placeholder** - `3307d70` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 used TDD (RED → GREEN)._

## Files Created/Modified
- `lib/validations/admin.ts` - Zod schemas: createWholesalerSchema, gradingCallbackSchema + exported types
- `app/api/grading/callback/route.ts` - POST handler with API key auth, VIN normalization, 401/400/404/500/200 paths
- `app/(admin)/layout.tsx` - Async RSC admin layout with role guard and sidebar
- `app/(admin)/AdminNav.tsx` - Client component for active link detection with lucide-react icons
- `app/(admin)/admin/page.tsx` - Dashboard placeholder page
- `app/actions/admin.ts` - createWholesalerAction, banUserAction, unbanUserAction with requireAdmin helper
- `middleware.ts` - Replaced auth-only /admin guard with full admin role check
- `tests/admin/grading-callback.test.ts` - 7 passing unit tests
- `tests/admin/create-wholesaler.test.ts` - Wave 0 it.todo stubs (4)
- `tests/admin/user-management.test.ts` - Wave 0 it.todo stubs (5)
- `tests/admin/admin-queries.test.ts` - Wave 0 it.todo stubs (4)
- `tests/admin/analytics.test.ts` - Wave 0 it.todo stubs (4)

## Decisions Made
- AdminNav isolated as client component so the layout RSC can stay server-rendered while still providing active link highlighting via usePathname()
- ZodError.issues used (not .errors) — TypeScript correctly flags this; auto-fixed during build verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ZodError property access in createWholesalerAction**
- **Found during:** Task 2 (build verification)
- **Issue:** Used `result.error.errors[0]` — TypeScript build failed because ZodError exposes `.issues` not `.errors`
- **Fix:** Changed to `result.error.issues[0]?.message`
- **Files modified:** app/actions/admin.ts
- **Verification:** `npx next build` succeeded with no TypeScript errors
- **Committed in:** 3307d70 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary for TypeScript correctness. No scope creep.

## Issues Encountered
None beyond the Zod property name fix above.

## User Setup Required
Set `GRADING_API_KEY` environment variable (in .env.local) to any secure random value. The external grading service must send this value in the `x-api-key` header when calling `POST /api/grading/callback`.

## Next Phase Readiness
- Admin foundation complete — layout, middleware, server actions all ready for Plans 02 and 03
- Plan 02 can wire up analytics dashboard (stat cards + recent orders)
- Plan 03 can wire up user management UI and wholesaler creation form
- Wave 0 test stubs ready to fill in with real assertions in Plans 02/03

---
*Phase: 04-admin-and-grading-scaffold*
*Completed: 2026-03-10*
