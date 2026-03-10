---
phase: 01-foundation
plan: "02"
subsystem: database
tags: [supabase, postgres, rls, migrations, storage, jwt, custom-access-token-hook]

# Dependency graph
requires:
  - phase: 01-01
    provides: Supabase client factories, middleware, admin client ready for DB ops
provides:
  - "profiles table with role column, RLS, and on_auth_user_created trigger"
  - "Custom Access Token Hook (public.custom_access_token_hook) injects role into JWT app_metadata"
  - "get_my_role() helper used in all downstream RLS policies"
  - "listings, listing_photos, listing_documents, orders, order_documents tables with full RLS"
  - "Grade scaffold on listings (grade, grade_source, graded_at — nullable, GRADE-03)"
  - "Three storage buckets: car-photos (public), car-documents (private), order-documents (private)"
affects: [03-auth-ui, 02-storefront, 03-orders, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "get_my_role() helper reads JWT app_metadata.role — all RLS policies use this, not direct profile lookups"
    - "Custom Access Token Hook registered in dashboard injects profiles.role into every JWT before issue"
    - "on_auth_user_created trigger auto-creates profiles row; direct INSERT blocked by policy"
    - "Storage buckets use RLS on storage.objects via bucket_id checks combined with get_my_role()"
    - "order-documents served via server-generated signed URLs only — no direct RLS read policy for buyers/sellers"

key-files:
  created:
    - supabase/migrations/001_profiles_and_hook.sql
    - supabase/migrations/002_schema.sql
    - supabase/migrations/003_storage_buckets.sql
  modified: []

key-decisions:
  - "SMTP deferred — no Resend account yet. Supabase default email works for development (2/hour limit). Will configure before production."
  - "listing_documents authenticated_read policy is intentionally broad for Phase 1 — Phase 3 will tighten to buyers with paid orders only"
  - "order-documents bucket has no buyer/seller read policy — all access is via signed URLs generated server-side (service role)"

patterns-established:
  - "get_my_role() pattern: all RLS policies read role from JWT app_metadata via this helper, not from a profile SELECT"
  - "Trigger-only profile creation: INSERT policy blocks direct client inserts; handle_new_user() trigger is the sole creator"
  - "Grade columns nullable by design: schema is ready for AI grading service (Phase 2+), no data yet"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, GRADE-03]

# Metrics
duration: ~30min (including human checkpoint verification)
completed: "2026-03-10"
---

# Phase 1 Plan 02: Database Schema and Migrations Summary

**Three SQL migrations applied to Supabase: profiles table with Custom Access Token Hook + JWT role injection, full 5-table RLS schema (listings with grade scaffold, orders, documents), and three storage buckets — all verified live**

## Performance

- **Duration:** ~30 min (including human checkpoint verification)
- **Started:** 2026-03-10T17:44:57Z
- **Completed:** 2026-03-10
- **Tasks:** 2 auto + 1 checkpoint (human-verified)
- **Files modified:** 3

## Accomplishments

- Three SQL migrations written and applied to hosted Supabase project via dashboard SQL editor
- Complete 6-table schema with RLS enabled on all tables; get_my_role() + Custom Access Token Hook pattern established
- Grade scaffold columns (grade, grade_source, graded_at) on listings table satisfy GRADE-03 requirement for AI grading in Phase 2+
- Three storage buckets created with appropriate public/private settings and RLS on storage.objects
- Custom Access Token Hook registered in Supabase Dashboard — role now injected into every JWT before issue
- Email templates, redirect URL allowlist, and dashboard configuration completed by user at checkpoint
- Schema test (tests/schema/listings.test.ts) passes against live database

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 001 — profiles, Custom Access Token Hook, trigger** - `ff94320` (feat)
2. **Task 2: Write migrations 002 and 003 — full schema and storage buckets** - `be117e7` (feat)
3. **Schema test fix — column select query** - `676689c` (fix)

## Files Created/Modified

- `supabase/migrations/001_profiles_and_hook.sql` - profiles table, get_my_role(), custom_access_token_hook(), handle_new_user() trigger
- `supabase/migrations/002_schema.sql` - listings (with grade columns), listing_photos, listing_documents, orders, order_documents + full RLS
- `supabase/migrations/003_storage_buckets.sql` - car-photos (public), car-documents (private), order-documents (private) buckets + storage.objects RLS

## Decisions Made

- **SMTP deferred:** No Resend account available at time of execution. Supabase default email (2/hour) is sufficient for development. Custom SMTP will be configured before production launch. Documented as known gap.
- **listing_documents broad read policy:** `authenticated_read_listing_documents` policy allows any authenticated user to read documents in Phase 1. Plan explicitly notes this is intentionally loose and Phase 3 will tighten to paid order buyers only.
- **order-documents signed URL pattern:** No direct RLS read policy for buyers/sellers on order-documents bucket. All access goes through server-generated signed URLs using service role client. This prevents accidental exposure of sensitive post-purchase documents.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed schema test column query**
- **Found during:** Post-checkpoint verification
- **Issue:** tests/schema/listings.test.ts queried information_schema.columns in a way that returned no rows in the Supabase environment
- **Fix:** Changed to direct column SELECT query against the listings table instead
- **Files modified:** tests/schema/listings.test.ts
- **Verification:** `npx vitest run tests/schema/listings.test.ts` passes (green)
- **Committed in:** 676689c

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Required to make the plan's own verification test pass. No scope creep.

## Issues Encountered

- Schema test used `information_schema.columns` query that the Supabase Postgres environment returns differently — fixed by using a direct column SELECT approach instead.

## User Setup Required

The following dashboard configuration was completed at the checkpoint:

1. **Custom Access Token Hook** registered at: Authentication > Hooks > Custom Access Token Hook > `public.custom_access_token_hook`
2. **Email confirmation template** updated to: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
3. **Password reset template** updated to: `{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery`
4. **Redirect URL allowlist** updated to include `http://localhost:3000/**`
5. **Custom SMTP (Resend):** DEFERRED — no Resend account yet. Using Supabase default email. Must configure before production.

## Next Phase Readiness

- Plan 03 (auth UI) can proceed: all tables, triggers, and hooks are live
- The Custom Access Token Hook is registered — JWT role injection is active for all new sign-ins
- SMTP gap: email confirmation and password reset emails will work via Supabase default (limited to 2/hour). Fine for development testing.
- Phase 2 (storefront) is unblocked: listings table with grade columns exists and is ready for Phase 2 write paths

---
*Phase: 01-foundation*
*Completed: 2026-03-10*
