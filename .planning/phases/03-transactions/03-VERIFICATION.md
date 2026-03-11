---
phase: 03-transactions
verified: 2026-03-10T22:25:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 3: Transactions Verification Report

**Phase Goal:** A consumer can purchase a vehicle via Stripe, receive all legally required documents for e-signing, and track order and document status entirely within the platform.
**Verified:** 2026-03-10T22:25:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Consumer can click Buy Now and be redirected to Stripe Checkout | VERIFIED | `app/(public)/listings/[id]/page.tsx` imports `createCheckoutSession` and wires it at line 120 via `<form action={createCheckoutSession.bind(null, listing.id)}>` |
| 2 | Stripe webhook creates order record and marks listing sold atomically | VERIFIED | `app/api/webhooks/stripe/route.ts` updates listing to 'sold' with race-safe `.eq('status', 'active')` guard, then inserts order and 2 order_documents stubs |
| 3 | Webhook is idempotent — duplicate events do not create duplicate orders | VERIFIED | Lines 61–69 of stripe webhook check for existing order by `stripe_checkout_session` before any mutation |
| 4 | Consumer sees order confirmation page after successful payment | VERIFIED | `app/(public)/checkout/success/page.tsx` fetches order by `stripe_checkout_session`, renders order number, vehicle, amount paid, next-steps messaging |
| 5 | Buyer receives order confirmation email after payment | VERIFIED | Stripe webhook calls `resend.emails.send` with `OrderConfirmationEmail` template synchronously inside `checkout.session.completed` handler |
| 6 | Admin receives order alert email when a sale occurs | VERIFIED | Stripe webhook calls `resend.emails.send` with `AdminOrderAlertEmail` to `ADMIN_EMAIL` inside `Promise.allSettled` alongside NOTF-01 |
| 7 | Purchase agreement PDF generated server-side after payment | VERIFIED | `lib/pdf/purchase-agreement.ts` exports `generatePurchaseAgreement` using PDFKit; called from `lib/fulfillment.ts`; produces Buffer with VIN, buyer, seller details |
| 8 | Bill of sale PDF generated server-side after payment | VERIFIED | `lib/pdf/bill-of-sale.ts` exports `generateBillOfSale` using PDFKit; called from `lib/fulfillment.ts`; produces Buffer with buyer/seller names |
| 9 | Both documents sent to Dropbox Sign for buyer e-signing | VERIFIED | `lib/fulfillment.ts` calls `signatureApi.signatureRequestSend()` with both PDFs wrapped as `RequestDetailedFile`, stores `esign_ref` on order_documents |
| 10 | Buyer receives Coast-branded signing notification email | VERIFIED | `lib/fulfillment.ts` sends `SigningRequestEmail` via Resend pointing buyer to `/account/orders/{orderId}` (not a Dropbox Sign URL) |
| 11 | Dropbox Sign callback updates order_documents status to signed | VERIFIED | `app/api/webhooks/dropbox-sign/route.ts` HMAC-verified handler updates `status='signed'`, `signed_at`, `signer_id` on matching order_documents rows |
| 12 | Consumer can view purchase history as order cards | VERIFIED | `app/(public)/account/orders/page.tsx` fetches orders with listing join, renders card grid with vehicle photo, year/make/model, VIN, price, date, status badge |
| 13 | Consumer can access signed documents from their account | VERIFIED | `app/(public)/account/orders/[orderId]/page.tsx` + `DownloadDocumentButton` + `getOrderDocumentUrl` server action issues Supabase `createSignedUrl` from private `order-documents` bucket |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `lib/stripe.ts` | Stripe client singleton | VERIFIED | Exports `stripe`, guards `STRIPE_SECRET_KEY` at module load, server-only comment present |
| `lib/dropbox-sign.ts` | Dropbox Sign API client | VERIFIED | Exports `signatureApi`, sets `username` from `DROPBOX_SIGN_API_KEY` |
| `lib/resend.ts` | Resend client singleton | VERIFIED | Exports `resend`, `ADMIN_EMAIL`, `FROM_EMAIL` |
| `lib/validations/order.ts` | Zod schemas for order/checkout | VERIFIED | Exports `checkoutSchema`, `orderSchema`, `orderStatusEnum`, `documentStatusEnum`, `documentTypeEnum` and all inferred types |
| `app/actions/checkout.ts` | createCheckoutSession server action | VERIFIED | Validates with `checkoutSchema`, price from DB only, calls `stripe.checkout.sessions.create`, redirects to Stripe URL |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler | VERIFIED | HMAC-verified, idempotent, creates order + marks listing sold + sends NOTF-01/02 + triggers `after()` for document pipeline |
| `app/(public)/checkout/success/page.tsx` | Order confirmation page | VERIFIED | 149 lines; fetches order by `stripe_checkout_session`, renders order number, vehicle, price, next-steps messaging, links to orders |
| `lib/email/order-confirmation.tsx` | React Email template NOTF-01 | VERIFIED | Exports `OrderConfirmationEmail`, Coast dark branding, CTA button linking to `/account/orders/{orderId}` |
| `lib/email/admin-order-alert.tsx` | React Email template NOTF-02 | VERIFIED | Exports `AdminOrderAlertEmail`, Coast dark branding, buyer info section |
| `lib/pdf/purchase-agreement.ts` | PDFKit purchase agreement generator | VERIFIED | Exports `generatePurchaseAgreement` and `PurchaseAgreementData`; LETTER size, VIN + buyer/seller sections, AS-IS terms, signature blocks |
| `lib/pdf/bill-of-sale.ts` | PDFKit bill of sale generator | VERIFIED | Exports `generateBillOfSale` and `BillOfSaleData`; standard BoS format, buyer/seller names, consideration, AS-IS disclaimer |
| `lib/fulfillment.ts` | Post-payment document pipeline | VERIFIED | Exports `generateAndSendDocuments`; 9-step orchestrator: fetch order/profiles → generate PDFs → upload to storage → Dropbox Sign → update docs → orders.status → NOTF-03 |
| `app/api/webhooks/dropbox-sign/route.ts` | Dropbox Sign callback handler | VERIFIED | HMAC-verified, multipart/form-data parsing, returns exact `Hello API Event Received` text, fires `handleAllSigned` as void fire-and-forget |
| `lib/email/signing-request.tsx` | React Email template NOTF-03 | VERIFIED | Exports `SigningRequestEmail`, "Sign Documents" CTA pointing to Coast order URL |
| `lib/email/documents-complete.tsx` | React Email template NOTF-04 | VERIFIED | Exports `DocumentsCompleteEmail`, notes that signed PDFs are attached |
| `app/(public)/account/orders/page.tsx` | Purchase history page | VERIFIED | 147 lines; RSC fetches orders with listing + photos, renders card grid (1 col mobile, 2 col lg), all 7 status badges, empty state with browse link |
| `app/(public)/account/orders/[orderId]/page.tsx` | Order detail page | VERIFIED | 272 lines; vehicle specs, payment section, per-document status with pulse animation for 'sent', DownloadDocumentButton for 'signed' |
| `app/actions/orders.ts` | Server action for document URLs | VERIFIED | Exports `getOrderDocumentUrl`; authenticates user, verifies buyer_id via order join, calls `createSignedUrl` with 1hr expiry |
| `components/storefront/BuyNowButton.tsx` | Buy Now client component | VERIFIED | Uses `useFormStatus` for pending state, shows "Processing..." during Stripe session creation |
| `app/(public)/account/orders/[orderId]/DownloadDocumentButton.tsx` | Download client component | VERIFIED | Uses `useTransition`, calls `getOrderDocumentUrl`, opens URL in new tab |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(public)/listings/[id]/page.tsx` | `app/actions/checkout.ts` | form action calling createCheckoutSession | WIRED | Line 7 imports `createCheckoutSession`; line 120 `<form action={createCheckoutSession.bind(null, listing.id)}>` |
| `app/actions/checkout.ts` | `lib/stripe.ts` | stripe.checkout.sessions.create | WIRED | Line 5 imports `stripe`; line 39 calls `stripe.checkout.sessions.create(...)` |
| `app/api/webhooks/stripe/route.ts` | `lib/supabase/admin.ts` | createAdminClient for service_role mutations | WIRED | Line 2 imports `createAdminClient`; line 57 `createAdminClient()` for all DB mutations |
| `app/api/webhooks/stripe/route.ts` | `lib/resend.ts` | resend.emails.send for NOTF-01 and NOTF-02 | WIRED | Lines 3 imports `resend`; lines 129 and 144 call `resend.emails.send(...)` |
| `app/(public)/checkout/success/page.tsx` | orders table | supabase query by stripe_checkout_session | WIRED | Line 17 fetches `.from('orders')...eq('stripe_checkout_session', session_id)` |
| `app/api/webhooks/stripe/route.ts` | `lib/fulfillment.ts` | after() callback invoking generateAndSendDocuments | WIRED | Line 8 imports `generateAndSendDocuments`; lines 162–164 `after(async () => { await generateAndSendDocuments(orderId) })` |
| `lib/fulfillment.ts` | `lib/pdf/purchase-agreement.ts` | generatePurchaseAgreement call | WIRED | Line 4 imports `generatePurchaseAgreement`; line 103 calls it in `Promise.all` |
| `lib/fulfillment.ts` | `lib/dropbox-sign.ts` | signatureApi.signatureRequestSend | WIRED | Line 2 imports `signatureApi`; line 175 calls `signatureApi.signatureRequestSend(signRequest)` |
| `lib/fulfillment.ts` | `lib/resend.ts` | resend.emails.send for NOTF-03 | WIRED | Line 3 imports `resend`; line 203 calls `resend.emails.send(...)` with `SigningRequestEmail` |
| `app/api/webhooks/dropbox-sign/route.ts` | `lib/resend.ts` | resend.emails.send for NOTF-04 with attachments | WIRED | Line 4 imports `resend`; line 213 calls `resend.emails.send(...)` with `attachments` field |
| `app/(public)/account/orders/page.tsx` | orders table | supabase select with buyer_id filter | WIRED | Line 58 `.from('orders').select('*, listings(...)').eq('buyer_id', user.id)` |
| `app/(public)/account/orders/[orderId]/page.tsx` | order_documents table | supabase select for document records | WIRED | Line 108 selects `order_documents(*)` via join on orders |
| `app/actions/orders.ts` | order-documents bucket | createSignedUrl for private access | WIRED | Line 49 `admin.storage.from('order-documents').createSignedUrl(storageKey, 3600)` |
| `app/(public)/layout.tsx` | `app/(public)/account/orders/page.tsx` | My Orders nav link for consumers | WIRED | Lines 26–30: `{role === 'consumer' && <Link href="/account/orders">My Orders</Link>}` — role-gated correctly |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PURCH-01 | 03-01, 03-02 | Consumer can purchase a vehicle via Stripe Checkout | SATISFIED | `createCheckoutSession` action + `BuyNowButton` wired on listing page |
| PURCH-02 | 03-01, 03-02 | Listing atomically marked sold when payment completes | SATISFIED | Stripe webhook `.update({ status: 'sold' }).eq('status', 'active')` race-safe guard |
| PURCH-03 | 03-02 | Consumer sees order confirmation page after successful purchase | SATISFIED | `/checkout/success` page fetches order by session_id and renders full confirmation |
| PURCH-04 | 03-04 | Consumer can view their purchase history | SATISFIED | `/account/orders` RSC with card grid, status badges, empty state |
| DOC-01 | 03-01, 03-03 | Purchase agreement PDF generated server-side | SATISFIED | `generatePurchaseAgreement` in `lib/pdf/purchase-agreement.ts`, called from fulfillment pipeline |
| DOC-02 | 03-01, 03-03 | Title transfer document generated server-side | SATISFIED | `generateBillOfSale` in `lib/pdf/bill-of-sale.ts` (title_transfer type), called from fulfillment pipeline |
| DOC-03 | 03-03 | Buyer receives e-signing request via Dropbox Sign | SATISFIED | `lib/fulfillment.ts` sends envelope to `signatureApi.signatureRequestSend()` with both PDFs |
| DOC-04 | 03-04 | Buyer can access signed documents from account | SATISFIED | `getOrderDocumentUrl` server action + `DownloadDocumentButton` client component on order detail page |
| DOC-05 | 03-01, 03-03 | Document completion status tracked per order | SATISFIED | `order_documents.status` progresses: pending → sent (fulfillment) → signed (Dropbox callback); UI reflects all states with badges |
| NOTF-01 | 03-01, 03-02 | Buyer receives order confirmation email after payment | SATISFIED | `OrderConfirmationEmail` sent via Resend synchronously in Stripe webhook |
| NOTF-02 | 03-01, 03-02 | Admin receives order alert email when sale occurs | SATISFIED | `AdminOrderAlertEmail` sent via Resend to `ADMIN_EMAIL` in same `Promise.allSettled` as NOTF-01 |
| NOTF-03 | 03-01, 03-03 | Buyer receives document signing request email | SATISFIED | `SigningRequestEmail` sent via Resend from `generateAndSendDocuments`, pointing buyer to Coast order page |
| NOTF-04 | 03-01, 03-03 | Buyer receives completed document delivery email | SATISFIED | `DocumentsCompleteEmail` sent with signed PDF attachments from Dropbox Sign callback handler |

No orphaned requirements found. All 13 requirement IDs assigned to Phase 3 in REQUIREMENTS.md are claimed and satisfied across plans 01–04.

---

### Test Suite Status

| File | Tests | Result |
|------|-------|--------|
| `tests/transactions/checkout.test.ts` | 3 | PASS |
| `tests/transactions/webhook-stripe.test.ts` | 4 | PASS |
| `tests/transactions/pdf.test.ts` | 4 | PASS |
| `tests/transactions/webhook-dropbox.test.ts` | 3 | PASS |
| `tests/transactions/emails.test.ts` | 4 | PASS |
| `tests/transactions/checkout.spec.ts` | 1 fixme | Playwright e2e stub (intentional) |
| `tests/transactions/orders.spec.ts` | 1 fixme | Playwright e2e stub (intentional) |
| **Total unit** | **18/18** | **PASS** |

All 18 unit tests pass. The 2 Playwright e2e stubs (`test.fixme()`) are intentional scaffolds for future e2e coverage — not regressions.

---

### Anti-Patterns Found

No blockers or stubs found in the implementation files. Checked all 20 files created/modified in this phase:

- No `TODO` or `FIXME` comments left in implementation code (one `// TODO Plan 03` comment was replaced by the actual `after()` wiring in Plan 03)
- No `return null` or `return {}` placeholders in component or API routes
- All email templates render substantive content, no placeholder text
- PDF generators produce real PDFs with vehicle and party data, not empty buffers

One informational item: `lib/dropbox-sign.ts` does not guard for missing `DROPBOX_SIGN_API_KEY` at module load (unlike `lib/stripe.ts`'s explicit guard). The key is set lazily on the instance. This is low risk — a missing key will produce an auth error on first API call rather than a crash at startup. Not a blocker.

---

### Human Verification Required

The following behaviors require a browser/live environment to confirm and cannot be verified programmatically:

#### 1. End-to-End Checkout Flow

**Test:** Log in as a consumer, navigate to an active listing, click "Buy Now", complete Stripe test checkout, observe redirect to `/checkout/success`
**Expected:** Confirmation page shows correct order number, vehicle name, and amount paid. "Documents are being prepared" messaging is visible.
**Why human:** Stripe Checkout redirect and webhook delivery require live Stripe test keys and a running server.

#### 2. Document Pipeline Delivery

**Test:** After completing a test purchase, wait for the `after()` fulfillment pipeline. Check buyer email inbox and Dropbox Sign test dashboard.
**Expected:** Buyer receives NOTF-03 email pointing to `/account/orders/{orderId}`. Dropbox Sign shows a pending signature request with both PDFs attached.
**Why human:** Requires live Dropbox Sign API key and Resend credentials; the `after()` callback runs post-response and cannot be unit-tested end-to-end.

#### 3. Document Status Lifecycle in UI

**Test:** From the order detail page, observe document status badges progress from "Being Prepared" → "Awaiting Signature" → "Signed" as the pipeline advances. Trigger the Dropbox Sign callback with a test tool.
**Expected:** Badges update without page reload (server-rendered RSC; requires refresh). "Awaiting your signature" pulse animation visible. Download button appears after signing.
**Why human:** Real-time DB state transitions driven by external webhooks require live environment.

#### 4. My Orders Nav Link Visibility

**Test:** Log in as a consumer, verify "My Orders" appears in the nav. Log in as a wholesaler/dealer, verify "My Orders" does not appear.
**Expected:** Role-gated correctly — consumers see the link, other roles do not.
**Why human:** Role is set via `app_metadata` which requires Supabase auth — not testable without a live session.

---

### Commit Verification

All commits confirmed in git log:

| Commit | Task |
|--------|------|
| `0726754` | Plan 01 Task 1: Service client singletons |
| `6d95b9b` | Plan 01 Task 2: Wave 0 test stubs |
| `34966a1` | Plan 02 Task 1: Checkout action, webhook, email templates |
| `8a21b37` | Plan 02 Task 2: Confirmation page, Buy Now wiring |
| `31d3b5d` | Plan 03 RED: Failing tests |
| `cb82094` | Plan 03 Task 1: PDF generators and email templates |
| `8fca466` | Plan 03 Task 2: Fulfillment, Dropbox callback, webhook wiring |
| `7f90de8` | Plan 04 Task 1: Purchase history page |
| `3fe3b84` | Plan 04 Task 2: Order detail page and server action |

---

_Verified: 2026-03-10T22:25:00Z_
_Verifier: Claude (gsd-verifier)_
