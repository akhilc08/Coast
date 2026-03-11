---
phase: 03-transactions
plan: 04
subsystem: ui
tags: [nextjs, supabase, rsc, server-actions, storage, signed-url]

# Dependency graph
requires:
  - phase: 03-transactions/03-02
    provides: orders table, order_documents table, private order-documents storage bucket, RLS policies
  - phase: 03-transactions/03-01
    provides: order validations, OrderStatus/DocumentStatus types

provides:
  - Consumer purchase history page at /account/orders (order card grid)
  - Order detail page at /account/orders/[orderId] with vehicle, payment, document status
  - getOrderDocumentUrl server action (private bucket signed URLs, 1hr expiry)
  - DownloadDocumentButton client component (calls server action, opens URL)
  - My Orders nav link in public layout for consumer role

affects: [03-notifications, 04-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RSC pages with explicit buyer_id filter alongside RLS for clarity
    - Client component isolated for download UX (useTransition), RSC page stays fully server-rendered
    - Admin client used only in server action for storage signed URLs (never in page RSC)

key-files:
  created:
    - app/(public)/account/orders/page.tsx
    - app/(public)/account/orders/[orderId]/page.tsx
    - app/(public)/account/orders/[orderId]/DownloadDocumentButton.tsx
    - app/actions/orders.ts
  modified:
    - app/(public)/layout.tsx

key-decisions:
  - "DownloadDocumentButton is a standalone client component — keeps RSC page fully server-rendered while still enabling useTransition for loading state"
  - "buyer_id verified both by RLS and explicit server action join check — defense in depth for signed URL generation"
  - "Signed URL expiry set to 1 hour (3600s) — short enough for security, long enough for user to complete download"

patterns-established:
  - "RSC page + isolated client component for single interactive action (download)"
  - "Server action ownership check: fetch document with order join, compare buyer_id to auth.uid() before issuing signed URL"

requirements-completed: [PURCH-04, DOC-04]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 3 Plan 4: Consumer Order History and Document Access Summary

**Purchase history page with order card grid and order detail with signed-URL document downloads from private Supabase storage bucket**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-11T02:06:39Z
- **Completed:** 2026-03-11T02:10:18Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Purchase history RSC at /account/orders shows color-coded order cards with vehicle photo, year/make/model, VIN, formatted price, date, and status badge
- Order detail RSC at /account/orders/[orderId] shows vehicle specs, payment info, seller name, and per-document status with pulse animation for pending signatures
- getOrderDocumentUrl server action authenticates user, verifies buyer ownership via order join, generates 1-hour Supabase signed URL from private order-documents bucket

## Task Commits

1. **Task 1: Purchase history page with order cards** - `7f90de8` (feat)
2. **Task 2: Order detail page with document access** - `3fe3b84` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/(public)/account/orders/page.tsx` - Purchase history RSC with order card grid, status badges, empty state
- `app/(public)/account/orders/[orderId]/page.tsx` - Order detail RSC with vehicle, payment, documents sections
- `app/(public)/account/orders/[orderId]/DownloadDocumentButton.tsx` - Client component, calls server action via useTransition, opens signed URL in new tab
- `app/actions/orders.ts` - getOrderDocumentUrl server action with auth + ownership verification
- `app/(public)/layout.tsx` - Added My Orders nav link for consumer role

## Decisions Made

- Isolated DownloadDocumentButton as a standalone client component rather than marking the entire page 'use client' — RSC page stays fully server-rendered with only the interactive download button as a client island
- Double ownership verification in server action: user must be authenticated AND the order join must confirm buyer_id matches auth.uid() before any signed URL is issued
- Signing link for 'sent' documents directed to email (v1 behavior per plan) — esign_ref stored but embedded Dropbox Sign signing URL deferred to future enhancement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Supabase join type cast in server action**
- **Found during:** Task 2 (order detail page / server action)
- **Issue:** `document.orders` typed as `{ buyer_id: any }[]` (array) by Supabase client; direct cast to `{ buyer_id: string }` caused TS2352
- **Fix:** Used `unknown` intermediate cast with Array.isArray guard to handle both array and object shapes safely
- **Files modified:** app/actions/orders.ts
- **Verification:** `npx tsc --noEmit` passes for all new files
- **Committed in:** 3fe3b84 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 type bug)
**Impact on plan:** Minor type fix only. No functional or scope changes.

## Issues Encountered

None beyond the TypeScript type cast noted above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Consumer order history and document access fully implemented
- Ready for phase 03-notifications (email triggers, signing request emails) which feeds document status changes visible on this page
- Status badges and document sections are wired to live DB data — will reflect updates from webhook/fulfillment pipeline automatically

---
*Phase: 03-transactions*
*Completed: 2026-03-10*
