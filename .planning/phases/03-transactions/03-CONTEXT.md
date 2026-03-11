# Phase 3: Transactions - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

A consumer can purchase a vehicle via Stripe Checkout, receive a purchase agreement and bill of sale for e-signing via Dropbox Sign, and track order and document status entirely within the platform. Four transactional emails are sent at key lifecycle points via Resend.

Document generation, e-signing, and notifications are all part of this phase. Admin panel is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### E-signing provider
- Dropbox Sign (managed SaaS) — not self-hosted
- Signing links shown in-app on the buyer's order page — no Dropbox Sign branded emails sent to buyer
- Coast sends its own notification email (via Resend) pointing buyer to their order page to sign
- Both documents (purchase agreement + bill of sale) bundled in a single Dropbox Sign envelope — one signing session
- Signed documents: available for download from order page AND emailed as attachments when signing completes

### Document content
- **Purchase agreement**: one-page, essential fields only — vehicle details (VIN, year/make/model, mileage, color), buyer name/email, seller business name, purchase price, date, signature blocks
- **Title transfer**: generic bill of sale — buyer handles state DMV registration separately. Not state-specific forms.
- Both documents are Coast-branded (logo at top, clean modern layout)

### Checkout flow
- "Buy Now" on vehicle detail page → direct redirect to Stripe hosted Checkout — no in-app confirmation page
- No listing reservation — listing stays available until Stripe webhook confirms payment. Second buyer's checkout fails if first completes.
- Listing atomically marked sold via Stripe webhook (not redirect) — already decided in prior phase planning
- Order confirmation page shows: order number, vehicle details, amount paid, and next steps ("Documents are being prepared. You'll receive an email when they're ready to sign.")

### Purchase history
- Order cards (not table) with vehicle photo, year/make/model, price, date, and status badge
- Status progression: Paid → Documents Sent → Signed → Complete
- Click card to see order detail page with document downloads and signing links

### Email delivery
- Provider: Resend — React Email for branded HTML templates
- 4 emails only (per requirements):
  1. Buyer order confirmation (NOTF-01)
  2. Admin order alert (NOTF-02) — sent to single admin email from env var
  3. Buyer signing request notification (NOTF-03) — Coast-sent, links to order page
  4. Buyer completed documents delivery with PDF attachments (NOTF-04)
- All emails are Coast-branded HTML (logo, consistent styling, clear CTAs)

### Claude's Discretion
- PDF generation library choice (PDFKit, @react-pdf/renderer, etc.)
- Exact purchase agreement and bill of sale layouts
- Order confirmation page design details
- Loading/error states throughout the checkout flow
- Stripe webhook error handling and retry logic
- Document generation async job implementation approach

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/listings/wizard/ListingWizard.tsx` — multi-step wizard pattern (step state machine, progress indicator) — reference for any multi-step flows
- `components/ui/card.tsx` — Card with CardHeader/CardContent/CardFooter — use for order cards in purchase history
- `components/ui/form.tsx` — RHF + Zod + shadcn form pattern — use if any forms needed
- `components/listings/DocumentUpload.tsx` — file upload + Supabase storage pattern — reference for document storage
- `lib/storage.ts` — storage key generation, URL building, MIME validation — extend for order-documents bucket
- `lib/supabase/admin.ts` — service role client — use for Stripe webhook handlers and document generation
- `components/ui/sonner.tsx` — toast notifications — use for checkout errors/confirmations

### Established Patterns
- Server Actions for all data mutations (`app/actions/listings.ts` as template)
- Dark theme: `bg-zinc-950 text-zinc-50` — all new pages must match
- Zod schemas in `lib/validations/` — create `order.ts` for order validation
- RLS policies enforce auth at DB layer — order mutations via service_role in webhooks

### Integration Points
- `middleware.ts` — add route protection for `/account/orders`, `/checkout` paths
- `app/(public)/layout.tsx` — auth-aware nav, will need "My Orders" link for authenticated consumers
- DB schema already has `orders` and `order_documents` tables with Stripe and e-sign fields (migration 002)
- Storage bucket `order-documents` already provisioned (migration 003) — private, 50MB, PDF only
- Vehicle detail page Buy CTA already scaffolded with auth check (Phase 2)

</code_context>

<specifics>
## Specific Ideas

- Confirmation page should clearly communicate next steps about document signing — buyer shouldn't wonder what happens next
- Status badges on order cards should make the lifecycle progression obvious at a glance
- Direct Stripe Checkout redirect keeps the purchase flow fast — no extra confirmation step

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within Phase 3 scope

</deferred>

---

*Phase: 03-transactions*
*Context gathered: 2026-03-10*
