---
phase: 03-transactions
plan: 03
subsystem: documents
tags: [pdfkit, dropbox-sign, fulfillment, react-email, tdd, webhooks]

# Dependency graph
requires:
  - phase: 03-01
    provides: lib/dropbox-sign.ts, lib/resend.ts
  - phase: 03-02
    provides: app/api/webhooks/stripe/route.ts, order_documents stubs
provides:
  - lib/pdf/purchase-agreement.ts — PDFKit purchase agreement generator (DOC-01)
  - lib/pdf/bill-of-sale.ts — PDFKit bill of sale generator (DOC-02)
  - lib/fulfillment.ts — Post-payment document pipeline orchestrator (DOC-03)
  - app/api/webhooks/dropbox-sign/route.ts — Dropbox Sign callback handler (DOC-05)
  - lib/email/signing-request.tsx — React Email template for NOTF-03
  - lib/email/documents-complete.tsx — React Email template for NOTF-04
affects:
  - 03-04-orders (order status progression now complete: paid → documents_sent → documents_signed)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PDFKit stream-to-Buffer via Promise wrapping (chunk collect in 'data' event, resolve on 'end')
    - Dropbox Sign RequestDetailedFile for Buffer-based file uploads (not ReadStream)
    - after() from next/server for fire-and-forget document pipeline post-Stripe-webhook
    - Dropbox Sign HMAC verification via createHmac('sha256', apiKey).update(time+type)
    - multipart/form-data parsing for Dropbox Sign callbacks (request.formData())
    - void handleAllSigned() fire-and-forget + 50ms setTimeout drain in tests
    - vi.clearAllMocks() chain restoration pattern for complex Supabase mock chains

key-files:
  created:
    - lib/pdf/purchase-agreement.ts
    - lib/pdf/bill-of-sale.ts
    - lib/email/signing-request.tsx
    - lib/email/documents-complete.tsx
    - lib/fulfillment.ts
    - app/api/webhooks/dropbox-sign/route.ts
  modified:
    - app/api/webhooks/stripe/route.ts
    - tests/transactions/pdf.test.ts
    - tests/transactions/emails.test.ts
    - tests/transactions/webhook-dropbox.test.ts
    - tests/transactions/webhook-stripe.test.ts

key-decisions:
  - "RequestDetailedFile used for Dropbox Sign file uploads — SDK RequestFile type is ReadStream|RequestDetailedFile, not Buffer directly; RequestDetailedFile wraps Buffer with filename/contentType metadata"
  - "after() used in Stripe webhook for document pipeline — genuinely long-running (PDF gen + Dropbox Sign API) vs synchronous emails in Plan 02 that fit in 5-second window"
  - "Dropbox Sign HMAC verified before response; handleAllSigned called as void fire-and-forget after 200 response to minimize Dropbox Sign retry risk"
  - "vi.clearAllMocks() wipes chainable mock implementations — beforeEach must restore .mockImplementation() for all chained mock functions after clearAllMocks()"

requirements-completed: [DOC-01, DOC-02, DOC-03, DOC-05, NOTF-03, NOTF-04]

# Metrics
duration: 8min
completed: 2026-03-10
---

# Phase 3 Plan 3: Document Pipeline Summary

**PDFKit document generation pipeline wired end-to-end: purchase agreement + bill of sale PDFs generated server-side, uploaded to Supabase Storage, sent to Dropbox Sign for buyer e-signing, with HMAC-verified callback handler updating document status and firing NOTF-04 with signed PDF email attachments**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-10T22:06:36Z
- **Completed:** 2026-03-10T22:15:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Created `generatePurchaseAgreement` and `generateBillOfSale` using PDFKit stream-to-Buffer pattern with LETTER size, Coast branding header, vehicle details, buyer/seller sections, AS-IS terms, and signature blocks
- Created 2 React Email templates: `SigningRequestEmail` (NOTF-03) with "Sign Documents" CTA pointing to Coast order page, and `DocumentsCompleteEmail` (NOTF-04) with note that signed PDFs are attached
- Implemented `generateAndSendDocuments` orchestrator that: fetches order/listing/profiles, generates PDFs, uploads to `order-documents` bucket, sends single Dropbox Sign envelope using `RequestDetailedFile`, updates order_documents rows, then sends NOTF-03 email via Resend
- Built Dropbox Sign callback handler with HMAC verification, multipart/form-data parsing, signed PDF download from Dropbox Sign API, re-upload with `-signed` suffix, document status update, and NOTF-04 email with PDF attachments
- Wired `after()` in Stripe webhook to invoke `generateAndSendDocuments` asynchronously after webhook response is sent
- All 18 unit tests pass across 5 test files

## Task Commits

1. **RED: Failing tests** - `31d3b5d` (test)
2. **Task 1: PDF generators and email templates** - `cb82094` (feat)
3. **Task 2: Fulfillment orchestrator, Dropbox Sign callback, webhook wiring** - `8fca466` (feat)

## Files Created/Modified

- `lib/pdf/purchase-agreement.ts` — PDFKit LETTER PDF, AS-IS terms, signature blocks, Coast header
- `lib/pdf/bill-of-sale.ts` — PDFKit LETTER PDF, standard BoS format, AS-IS disclaimer
- `lib/email/signing-request.tsx` — NOTF-03 React Email, dark branding, "Sign Documents" CTA
- `lib/email/documents-complete.tsx` — NOTF-04 React Email, dark branding, attachment note
- `lib/fulfillment.ts` — post-payment document pipeline: PDF gen → storage → Dropbox Sign → NOTF-03
- `app/api/webhooks/dropbox-sign/route.ts` — HMAC-verified callback, signed PDF handling, NOTF-04
- `app/api/webhooks/stripe/route.ts` — added after() + generateAndSendDocuments wiring
- `tests/transactions/pdf.test.ts` — 4 tests: Buffer length + %PDF header for both generators
- `tests/transactions/emails.test.ts` — completed todos: SigningRequestEmail, DocumentsCompleteEmail
- `tests/transactions/webhook-dropbox.test.ts` — 3 tests: valid event, invalid hash, status update
- `tests/transactions/webhook-stripe.test.ts` — added next/server mock for after(), fulfillment mock

## Decisions Made

- **RequestDetailedFile for Dropbox Sign files**: The `@dropbox/sign` SDK's `RequestFile` type is `ReadStream | RequestDetailedFile`. Buffers cannot be assigned directly. `RequestDetailedFile` wraps a Buffer with filename and contentType metadata — the correct approach for in-memory PDF generation.

- **after() for document pipeline**: Unlike NOTF-01/NOTF-02 emails (sent synchronously in Plan 02 to stay within Stripe's 5-second window), document generation genuinely takes 2-5 seconds (PDF generation + Dropbox Sign API call). `after()` from `next/server` provides correct post-response async execution on Vercel.

- **Fire-and-forget handleAllSigned in Dropbox callback**: The Dropbox Sign callback returns `Hello API Event Received` immediately and fires `handleAllSigned` as a void promise. This minimizes the risk of Dropbox Sign retrying due to timeout.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dropbox Sign SDK rejects Buffer as RequestFile**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `lib/fulfillment.ts` assigned `Buffer` objects to the `files` field of `SignatureRequestSendRequest`. TypeScript error TS2322: `Buffer` is not assignable to `RequestFile` (which is `ReadStream | RequestDetailedFile`).
- **Fix:** Wrapped each Buffer in `RequestDetailedFile` with `{ value: Buffer, options: { filename, contentType } }` structure
- **Files modified:** lib/fulfillment.ts
- **Commit:** 8fca466

**2. [Rule 1 - Bug] instanceof Uint8Array fails TypeScript narrowing**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `filesResponse.body instanceof Uint8Array` — TypeScript error TS2358 on left-hand side type
- **Fix:** Replaced instanceof check with `typeof ... === 'object' && ... !== null` guard + `Buffer.from(...as ArrayBuffer)`
- **Files modified:** app/api/webhooks/dropbox-sign/route.ts
- **Commit:** 8fca466

**3. [Rule 1 - Bug] after() throws outside Next.js request scope in tests**
- **Found during:** Task 2 (test run)
- **Issue:** `after()` from `next/server` throws "was called outside a request scope" in Vitest. After wiring `after()` into the Stripe webhook, the existing webhook test broke.
- **Fix:** Added `vi.mock('next/server', ...)` at the top of webhook-stripe test, implementing `after` as a synchronous invoker for test isolation. Also mocked `@/lib/fulfillment` to prevent actual PDF/Dropbox work in webhook tests.
- **Files modified:** tests/transactions/webhook-stripe.test.ts
- **Commit:** 8fca466

**4. [Rule 1 - Bug] vi.clearAllMocks() wipes chainable mock implementations**
- **Found during:** Task 2 (test run — dropbox 3rd test)
- **Issue:** `vi.clearAllMocks()` in `beforeEach` removed `.mockImplementation()` factory functions from chainable Supabase mocks (e.g., `mockOrderDocsUpdate` returning `{ eq: ... }`). The `handleAllSigned` function called `update().eq(...)` which crashed silently inside the try/catch, resulting in 0 calls to `mockOrderDocsUpdate`.
- **Fix:** Added explicit `.mockImplementation()` restoration calls in `beforeEach` after `vi.clearAllMocks()`. Also fixed incorrect mock chain depth (extra `.eq()` hop for orders/profiles select chains).
- **Files modified:** tests/transactions/webhook-dropbox.test.ts
- **Commit:** 8fca466

---

**Total deviations:** 4 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minor corrections; no scope changes.

## Self-Check

Files created/exist:
- lib/pdf/purchase-agreement.ts ✓
- lib/pdf/bill-of-sale.ts ✓
- lib/email/signing-request.tsx ✓
- lib/email/documents-complete.tsx ✓
- lib/fulfillment.ts ✓
- app/api/webhooks/dropbox-sign/route.ts ✓

Commits:
- 31d3b5d (test RED phase) ✓
- cb82094 (feat Task 1) ✓
- 8fca466 (feat Task 2) ✓

## Self-Check: PASSED

All 6 created files confirmed on disk. All 3 task commits confirmed in git log. 18/18 tests pass.
