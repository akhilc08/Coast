# Codebase Concerns

**Analysis Date:** 2026-04-01

## Tech Debt

**Transport layer is mock-only in production:**
- Issue: `getTransportProvider()` defaults to `MockTransportProvider` unless `TRANSPORT_PROVIDER=central_dispatch` is set. `CentralDispatchProvider` throws `Error('Central Dispatch API not yet configured')` on every call. All live orders with delivery use a mock that generates fake `MOCK-{uuid}` dispatch IDs and never contacts a real carrier.
- Files: `lib/transport/index.ts`, `lib/transport/mock-provider.ts`, `lib/transport/central-dispatch-provider.ts`
- Impact: Transport dispatch records in the database are fabricated. `transport_quote_tbd` orders are silently billed out-of-band with no automated follow-up flow.
- Fix approach: Implement `CentralDispatchProvider.getQuote()` and `.dispatch()`, add `CENTRAL_DISPATCH_API_KEY` and `CENTRAL_DISPATCH_API_URL` env vars, add `/api/webhooks/central-dispatch` for `in_transit` and `delivered` status transitions.

**Dropbox Sign SDK authentication uses internal type cast:**
- Issue: The `@dropbox/sign` SDK's public API does not expose `authentications` so the library's private structure is accessed via `as unknown as` to inject the API key.
- Files: `lib/dropboxsign.ts` line 14
- Impact: Any SDK version bump that renames or restructures the internal `authentications` property will silently fail at runtime with no compile-time warning.
- Fix approach: Switch to the SDK's officially supported constructor that accepts an `apiKey` option, or pin the SDK version and add a runtime assertion.

**`updateConditionAction` does not check `condition_locked`:**
- Issue: `saveAiConditionAction` sets `condition_locked: true` on the listing, but `updateConditionAction` (manual condition entry) never checks this field before writing. A seller can overwrite AI-verified condition data with manual entries after AI lock.
- Files: `app/actions/listings.ts` lines 238-279
- Impact: Condition integrity guarantees for AI-verified listings can be bypassed without any DB-level enforcement visible in the codebase.
- Fix approach: Add `.eq('condition_locked', false)` guard to the `updateConditionAction` query, or check and return `{ error: 'Condition is locked' }` before the update.

**`publishListingAction` only checks `pickup_zip`, not price:**
- Issue: Publish guard verifies `pickup_zip` is set but does not guard against `price_cents: 0` (the value set at draft creation). A listing can be published with a $0 price.
- Files: `app/actions/listings.ts` lines 65-93
- Impact: Buyers could purchase a vehicle for $0 if a seller publishes without setting a price.
- Fix approach: Add a `price_cents > 0` guard before the status update in `publishListingAction`.

**`upsertPhotoPositionsAction` has no per-photo ownership check:**
- Issue: The action verifies the user is authenticated but calls `.upsert(positions, { onConflict: 'id' })` without joining to `listings` to confirm the requesting user owns the listing. Any authenticated seller can reorder photos on another seller's listing by guessing photo UUIDs.
- Files: `app/actions/listings.ts` lines 114-127
- Impact: Low-severity IDOR — positions can be scrambled on another seller's listing. Cannot steal or destroy data, but violates ownership isolation.
- Fix approach: Join through `listing_photos → listings.seller_id` and assert ownership, similar to how `deletePhotoAction` is structured.

**Supabase join type resolved with `as unknown as`:**
- Issue: Supabase's TypeScript types represent joined rows as `object | object[]` rather than the precise shape, requiring a manual cast in two pages and one server action.
- Files: `app/actions/orders.ts` line 36, `app/(public)/account/orders/[orderId]/page.tsx` line 146, `app/(public)/account/orders/page.tsx` line 64
- Impact: Type safety is lost at these boundaries; a schema change would not surface as a compile error.
- Fix approach: Regenerate Supabase types after schema stabilizes; the casts should become unnecessary.

## Known Bugs

**Dropbox Sign webhook handler is fire-and-forget with no retry:**
- Symptoms: `handleAllSigned` is called with `void` (line 47 of the webhook route). If the function fails after returning `200`, Dropbox Sign will not retry because the `200` was already sent. Order status will not advance to `documents_signed` and NOTF-04 will not be sent.
- Files: `app/api/webhooks/dropboxsign/route.ts` lines 46-51
- Trigger: Any transient error in `handleAllSigned` (Supabase unavailable, storage upload fails) during the window after `200` is returned.
- Workaround: Admin can manually update `order_documents.status` and `orders.status` in Supabase dashboard.

**Fulfillment pipeline partial-failure leaves order in inconsistent state:**
- Symptoms: `_generateDocuments` uploads PDFs and updates `order_documents.storage_key` before calling Dropbox Sign. If the Sign API call fails, `order_documents.status` is updated to `'sent'` (step 7) even though `esign_ref` is absent. Order progresses to `'documents_sent'` with no signature request ID — the buyer receives a signing email linking to an order page but there is nothing to sign.
- Files: `lib/fulfillment.ts` lines 186-199
- Trigger: Dropbox Sign API error or timeout after PDF upload succeeds.
- Workaround: None automated. Requires manual intervention to re-trigger document generation or reset order status.

## Security Considerations

**Contact form has no rate limiting or input sanitization:**
- Risk: The `/api/contact` endpoint accepts arbitrary `name`, `email`, `company`, and `message` strings with only a presence check. No rate limiting, no email format validation, no length cap. Can be used for email spam relay (Resend) or content injection into admin inbox.
- Files: `app/api/contact/route.ts`
- Current mitigation: None.
- Recommendations: Add Zod validation with email regex and field length limits; add IP-based rate limiting (Vercel's `@vercel/kv` or middleware).

**`ADMIN_EMAIL` and `RESEND_API_KEY` use non-null assertion without runtime guard:**
- Risk: `lib/resend.ts` exports `ADMIN_EMAIL` as `process.env.ADMIN_EMAIL!`. If the env var is unset in any deployment, the exclamation suppresses TypeScript warnings and the value is `undefined` at runtime, silently causing Resend to reject emails without crashing the webhook handler (which uses `Promise.allSettled`).
- Files: `lib/resend.ts` line 6
- Current mitigation: Stripe and Supabase clients throw eagerly on missing keys; Resend does not.
- Recommendations: Add an explicit guard matching the pattern in `lib/stripe.ts`.

**Grading callback secured only by a shared secret key:**
- Risk: `/api/grading/callback` uses a static `GRADING_API_KEY` header check with no HMAC or request signing. Key rotation requires a deployment. Key exposure means arbitrary grade manipulation on any listing by VIN.
- Files: `app/api/grading/callback/route.ts`
- Current mitigation: Single shared secret header.
- Recommendations: Add HMAC-SHA256 request signing or migrate to Dropbox Sign-style event verification when the grading service supports it.

**Hardcoded admin email in contact API route:**
- Risk: `admin@drivewithcoast.com` is hardcoded in `app/api/contact/route.ts` and `app/(public)/sellers/page.tsx`. This email is inconsistent with `ADMIN_EMAIL` env var (used elsewhere) and will not update when the admin address changes.
- Files: `app/api/contact/route.ts` line 13, `app/(public)/sellers/page.tsx` line 202
- Current mitigation: None.
- Recommendations: Replace with `process.env.ADMIN_EMAIL` to use the single source of truth.

**No check preventing a seller from purchasing their own listing:**
- Risk: `createCheckoutSession` and `proceedToCheckout` do not verify `user.id !== listing.seller_id`. A seller with a `consumer` role (or dual role) could initiate a Stripe session for their own listing, potentially triggering payout to themselves.
- Files: `app/actions/checkout.ts` lines 17-66, 78-175
- Current mitigation: Role check on the listing detail page (`canBuy = role === 'consumer'`) is UI-only and not enforced server-side.
- Recommendations: Add `if (listing.seller_id === user.id) throw new Error('Cannot purchase your own listing')` in both checkout actions.

**`/api/condition/extract` passes PDF to Anthropic with no file-size or file-type guard:**
- Risk: Any authenticated seller can POST any `storageKey` from `car-documents` to the AI extraction endpoint. Large PDFs will consume significant API budget. There is no size cap or MIME verification before the download and base64 encode.
- Files: `app/api/condition/extract/route.ts` lines 82-96
- Current mitigation: Ownership check ensures the listing belongs to the requesting user.
- Recommendations: Add a file-size limit check after download (e.g., reject files over 20 MB); consider a MIME header check.

## Performance Bottlenecks

**Listing detail page performs 4 sequential Supabase queries:**
- Problem: `getListing`, `getSellerStats`, `getPublicSellerProfile`, and `supabase.auth.getUser()` are called in the page server component. `getSellerStats` and `getPublicSellerProfile` are wrapped in `Promise.all`, but `getListing` and `auth.getUser()` run sequentially before them.
- Files: `app/(public)/listings/[id]/page.tsx` lines 49-64
- Cause: `getListing` must complete before `seller_id` is available for the parallel calls.
- Improvement path: Consider embedding seller stats in the listings query via a Supabase join or materialized view to reduce round-trips.

**`fulfillment._generateDocuments` makes 6 sequential DB round-trips:**
- Problem: Order, listing, buyer profile, and seller profile are fetched in 4 sequential `await` calls rather than a single joined query.
- Files: `lib/fulfillment.ts` lines 52-94
- Cause: Sequential individual selects instead of a joined query.
- Improvement path: Consolidate into a single query with foreign table joins.

## Fragile Areas

**Post-payment pipeline is synchronous inside Vercel `after()`:**
- Files: `app/api/webhooks/stripe/route.ts` lines 174-178, `lib/fulfillment.ts`
- Why fragile: `after()` extends execution past the HTTP response but Vercel still imposes a maximum function duration. PDF generation (`pdfkit`), two Supabase storage uploads, Dropbox Sign API call, and a Resend email are all chained. If any step is slow, the entire pipeline may be killed mid-execution without cleanup.
- Safe modification: Always test with Stripe CLI replay (`stripe trigger checkout.session.completed`) when changing anything in `lib/fulfillment.ts`.
- Test coverage: No tests cover the `generateAndSendDocuments` orchestration path end-to-end.

**Domain name inconsistency across three hardcoded strings:**
- Files: `lib/fulfillment.ts` line 202 (`coastautos.com`), `lib/email/order-confirmation.tsx` line 38 (`coastautos.com`), `lib/email/documents-complete.tsx` line 62 (`coastautos.com`), `app/api/contact/route.ts` line 13 (`drivewithcoast.com`), `lib/resend.ts` line 9 (`drivewithcoast.com`)
- Why fragile: Two different domain names appear in production email content. `NEXT_PUBLIC_URL` is the correct source of truth but is only used for URLs, not for display addresses or `from` headers.

## Test Coverage Gaps

**No tests for Stripe webhook handler:**
- What's not tested: `checkout.session.completed` event handling, idempotency check, order creation, listing status update, `after()` trigger.
- Files: `app/api/webhooks/stripe/route.ts`
- Risk: Silent regressions in the order creation flow would only surface in production.
- Priority: High

**No tests for Dropbox Sign webhook handler:**
- What's not tested: Signature verification, `handleAllSigned` happy path, PDF download/upload, order status transition to `documents_signed`, NOTF-04 email.
- Files: `app/api/webhooks/dropboxsign/route.ts`
- Risk: Document signing completion can silently fail.
- Priority: High

**No tests for `fulfillment.generateAndSendDocuments`:**
- What's not tested: PDF generation, Supabase storage upload, Dropbox Sign send request, NOTF-03 email, partial failure behavior.
- Files: `lib/fulfillment.ts`
- Risk: Regressions in the document pipeline are not caught until a real order is placed.
- Priority: High

**No tests for checkout server actions:**
- What's not tested: `createCheckoutSession`, `proceedToCheckout` transport fee derivation, TBD quote path, Stripe session metadata.
- Files: `app/actions/checkout.ts`
- Priority: High

**Transport dispatch has no tests against real provider behavior:**
- What's not tested: `CentralDispatchProvider` (not yet implemented), failure path that sets `transport_status: 'failed'`, `transport_quote_tbd` billing logic.
- Files: `lib/transport/dispatch.ts`, `lib/transport/central-dispatch-provider.ts`
- Priority: Medium (blocked on Central Dispatch implementation)

## Dependencies at Risk

**`@dropbox/sign` SDK internal API access:**
- Risk: Authentication is set via an undocumented internal property path (`authentications['api_key'].username`). This is not part of the SDK's public API contract.
- Impact: Any minor/patch SDK update could silently break signing requests.
- Migration plan: Monitor SDK changelog for an official `apiKey` constructor option; update `lib/dropboxsign.ts` when available.

---

*Concerns audit: 2026-04-01*
