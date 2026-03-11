---
phase: 03-transactions
plan: 01
subsystem: payments
tags: [stripe, dropbox-sign, resend, pdfkit, zod, testing]

# Dependency graph
requires:
  - phase: 02-inventory
    provides: lib/validations/listing.ts pattern for Zod schemas and project conventions
provides:
  - lib/stripe.ts — Stripe client singleton (API version 2026-02-25.clover)
  - lib/dropbox-sign.ts — Dropbox Sign SignatureRequestApi client
  - lib/resend.ts — Resend client with ADMIN_EMAIL and FROM_EMAIL exports
  - lib/validations/order.ts — Zod schemas for checkout, order, document types and enums
  - tests/transactions/ — Wave 0 test stubs (5 unit files, 2 e2e stubs)
affects:
  - 03-02-checkout
  - 03-03-documents
  - 03-04-emails

# Tech tracking
tech-stack:
  added:
    - stripe ^17 (payment processing)
    - "@dropbox/sign (e-signing API client)"
    - resend (transactional email delivery)
    - "@react-email/components (email template rendering)"
    - pdfkit (PDF generation)
    - "@types/pdfkit (TypeScript types)"
  patterns:
    - Service client singletons in lib/ with server-only guard comments
    - Zod schemas colocated with domain in lib/validations/
    - Wave 0 it.todo() stubs in tests/ to define verification contracts before implementation

key-files:
  created:
    - lib/stripe.ts
    - lib/dropbox-sign.ts
    - lib/resend.ts
    - lib/validations/order.ts
    - tests/transactions/checkout.test.ts
    - tests/transactions/webhook-stripe.test.ts
    - tests/transactions/pdf.test.ts
    - tests/transactions/webhook-dropbox.test.ts
    - tests/transactions/emails.test.ts
    - tests/transactions/checkout.spec.ts
    - tests/transactions/orders.spec.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Stripe API version pinned to 2026-02-25.clover (installed package version — plan referenced outdated 2024-11-20.acacia)"
  - "orderStatusEnum matches DB CHECK constraints: pending_payment, paid, documents_sent, documents_signed, complete, cancelled, refunded"

patterns-established:
  - "Pattern 1: Server-only clients throw at module load if env var missing (not lazy-check)"
  - "Pattern 2: Wave 0 test stubs use it.todo() for unit tests and test.fixme() for Playwright e2e stubs"

requirements-completed: [PURCH-01, PURCH-02, DOC-01, DOC-02, DOC-05, NOTF-01, NOTF-02, NOTF-03, NOTF-04]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 3 Plan 1: Service Client Singletons and Wave 0 Test Stubs Summary

**Stripe, Dropbox Sign, and Resend client singletons with order Zod schemas and 18 Wave 0 test todos across 7 files covering all Phase 3 requirement IDs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-11T01:48:39Z
- **Completed:** 2026-03-11T01:51:49Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Installed all Phase 3 npm packages: stripe, @dropbox/sign, resend, @react-email/components, pdfkit
- Created 3 service client singletons (lib/stripe.ts, lib/dropbox-sign.ts, lib/resend.ts) with server-only guards
- Defined order Zod schemas and enums matching DB CHECK constraints in lib/validations/order.ts
- Scaffolded 7 Wave 0 test files with 18 unit todos and 2 e2e fixme stubs covering all 9 requirement IDs

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages, create service client singletons and order schemas** - `0726754` (feat)
2. **Task 2: Create Wave 0 test stubs for all Phase 3 requirements** - `6d95b9b` (feat)

**Plan metadata:** (docs: complete plan — see below)

## Files Created/Modified
- `lib/stripe.ts` — Stripe client singleton, API version 2026-02-25.clover, server-only guard
- `lib/dropbox-sign.ts` — Dropbox Sign SignatureRequestApi with username from env var
- `lib/resend.ts` — Resend client, ADMIN_EMAIL and FROM_EMAIL exports
- `lib/validations/order.ts` — checkoutSchema, orderSchema, orderStatusEnum, documentStatusEnum, documentTypeEnum plus inferred types
- `tests/transactions/checkout.test.ts` — PURCH-01 (3 todos)
- `tests/transactions/webhook-stripe.test.ts` — PURCH-02 (4 todos)
- `tests/transactions/pdf.test.ts` — DOC-01, DOC-02 (4 todos)
- `tests/transactions/webhook-dropbox.test.ts` — DOC-05 (3 todos)
- `tests/transactions/emails.test.ts` — NOTF-01 through NOTF-04 (4 todos)
- `tests/transactions/checkout.spec.ts` — PURCH-03 Playwright e2e stub (fixme)
- `tests/transactions/orders.spec.ts` — PURCH-04 Playwright e2e stub (fixme)
- `package.json` — 6 new dependencies added

## Decisions Made
- Stripe API version updated from plan's `2024-11-20.acacia` to `2026-02-25.clover` — the installed stripe package requires the current version string; using the outdated string caused a TS2322 type error
- orderStatusEnum values match DB CHECK constraints exactly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe API version string updated to match installed package**
- **Found during:** Task 1 (create lib/stripe.ts)
- **Issue:** Plan specified `apiVersion: '2024-11-20.acacia'` but installed stripe package requires `'2026-02-25.clover'` — caused TS2322 type error on compile
- **Fix:** Updated apiVersion to `'2026-02-25.clover'` (the LatestApiVersion exported by installed stripe package)
- **Files modified:** lib/stripe.ts
- **Verification:** `npx tsc --noEmit lib/stripe.ts` passes cleanly
- **Committed in:** `0726754` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minor version string correction required for TypeScript correctness. No scope change.

## Issues Encountered
None beyond the Stripe API version auto-fix above.

## User Setup Required

The following environment variables must be set before running Phase 3 code:

**Stripe:**
- `STRIPE_SECRET_KEY` — Stripe Dashboard -> Developers -> API keys -> Secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe Dashboard -> Developers -> Webhooks -> Signing secret (create endpoint first)
- `NEXT_PUBLIC_URL` — Your app URL (e.g., http://localhost:3000 for dev)

**Dropbox Sign:**
- `DROPBOX_SIGN_API_KEY` — Dropbox Sign Dashboard -> API -> API Key

**Resend:**
- `RESEND_API_KEY` — Resend Dashboard -> API Keys -> Create API Key
- `ADMIN_EMAIL` — Admin email address for order alert notifications

## Next Phase Readiness
- All 3 service clients importable and typed — Plans 02, 03, 04 can import and use them immediately
- Order validation schemas in place — createCheckoutSession (Plan 02) validates against checkoutSchema
- Wave 0 test contracts established — 18 todos define the verification target for all Phase 3 implementation

---
*Phase: 03-transactions*
*Completed: 2026-03-10*
