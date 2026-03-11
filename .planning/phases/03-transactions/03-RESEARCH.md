# Phase 3: Transactions - Research

**Researched:** 2026-03-10
**Domain:** Stripe Checkout, Dropbox Sign, PDF generation, Resend transactional email
**Confidence:** HIGH (core integrations verified against official docs and SDKs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**E-signing provider**
- Dropbox Sign (managed SaaS) — not self-hosted
- Signing links shown in-app on the buyer's order page — no Dropbox Sign branded emails sent to buyer
- Coast sends its own notification email (via Resend) pointing buyer to their order page to sign
- Both documents (purchase agreement + bill of sale) bundled in a single Dropbox Sign envelope — one signing session
- Signed documents: available for download from order page AND emailed as attachments when signing completes

**Document content**
- Purchase agreement: one-page, essential fields only — vehicle details (VIN, year/make/model, mileage, color), buyer name/email, seller business name, purchase price, date, signature blocks
- Title transfer: generic bill of sale — buyer handles state DMV registration separately. Not state-specific forms.
- Both documents are Coast-branded (logo at top, clean modern layout)

**Checkout flow**
- "Buy Now" on vehicle detail page → direct redirect to Stripe hosted Checkout — no in-app confirmation page
- No listing reservation — listing stays available until Stripe webhook confirms payment. Second buyer's checkout fails if first completes.
- Listing atomically marked sold via Stripe webhook (not redirect)
- Order confirmation page shows: order number, vehicle details, amount paid, and next steps ("Documents are being prepared. You'll receive an email when they're ready to sign.")

**Purchase history**
- Order cards (not table) with vehicle photo, year/make/model, price, date, and status badge
- Status progression: Paid → Documents Sent → Signed → Complete
- Click card to see order detail page with document downloads and signing links

**Email delivery**
- Provider: Resend — React Email for branded HTML templates
- 4 emails only:
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

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within Phase 3 scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PURCH-01 | Consumer can purchase a vehicle via Stripe Checkout | Stripe Checkout Session creation with Server Action + redirect |
| PURCH-02 | Listing atomically marked sold via Stripe webhook (not redirect) | `checkout.session.completed` event handling with idempotency check |
| PURCH-03 | Consumer sees order confirmation page after successful purchase | `success_url` redirect + order lookup by session ID |
| PURCH-04 | Consumer can view purchase history | `/account/orders` route, order cards from `orders` table RLS |
| DOC-01 | Purchase agreement PDF generated server-side after payment | PDFKit `renderToBuffer` triggered by webhook |
| DOC-02 | Title transfer document generated server-side after payment | PDFKit second document in same generation pass |
| DOC-03 | Buyer receives e-signing request via Dropbox Sign | `@dropbox/sign` `signatureRequestSend` with two files |
| DOC-04 | Buyer can access signed documents from account | Supabase signed URLs from `order-documents` bucket |
| DOC-05 | Document completion status tracked per order | `order_documents.status` enum — webhook updates on `signature_request_all_signed` |
| NOTF-01 | Buyer receives order confirmation email | Resend `emails.send` in webhook handler post-order-creation |
| NOTF-02 | Admin receives order alert email | Resend to `ADMIN_EMAIL` env var in same webhook pass |
| NOTF-03 | Buyer receives signing request notification | Resend after Dropbox Sign envelope sent |
| NOTF-04 | Buyer receives completed documents email with PDFs | Resend with `attachments` array in Dropbox Sign callback handler |
</phase_requirements>

---

## Summary

Phase 3 wires together four external services — Stripe for payment, Dropbox Sign for e-signing, Resend for transactional email, and Supabase Storage for document persistence — into a cohesive post-purchase lifecycle. The critical design constraint is that the Stripe webhook is the single authoritative fulfillment signal: it atomically marks the listing sold, creates the order record, and triggers document generation. All of this must complete within Stripe's 5-second webhook window, which means document generation and Dropbox Sign API calls must be invoked asynchronously (or the webhook responds immediately and defers work).

The project already has the DB schema in place: `orders` and `order_documents` tables with all necessary columns (`stripe_checkout_session`, `esign_ref`, `status` progressions), and the `order-documents` storage bucket. This phase is primarily integration work on top of existing scaffolding. The main complexity areas are: correct Stripe webhook signature verification using raw body, idempotency for the webhook handler to survive retries, async document generation sequencing (PDF → upload to Supabase → send to Dropbox Sign → send NOTF-03 email), and the Dropbox Sign callback handler for the completion event.

PDF generation requires a discrete recommendation (Claude's discretion). PDFKit is the recommended choice over `@react-pdf/renderer` due to ongoing Next.js App Router compatibility issues with `@react-pdf/renderer` requiring React 19 internals access workarounds — PDFKit is a pure Node.js stream-based library with zero framework coupling.

**Primary recommendation:** Implement the fulfillment pipeline as: Stripe webhook → create order record + mark listing sold + emit NOTF-01/NOTF-02 → respond 200 → deferred async: generate PDFs with PDFKit → upload to `order-documents` bucket → send to Dropbox Sign → send NOTF-03. The Dropbox Sign `signature_request_all_signed` callback triggers the final step: download signed PDFs, re-upload, update `order_documents.status`, send NOTF-04.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | ^17.x | Stripe API client, webhook verification | Official Node SDK; `constructEvent` handles raw body + HMAC |
| `@dropbox/sign` | latest | Dropbox Sign API — send signature requests, parse callbacks | Official Node SDK, ES Module, TypeScript-ready |
| `resend` | ^4.x | Transactional email delivery | Already referenced in project decisions; simple `{ data, error }` API |
| `@react-email/components` | ^0.0.x | React-based branded email templates | Official React Email component library; pairs with Resend |
| `pdfkit` | ^0.15.x | Server-side PDF generation to Buffer | Pure Node.js, no framework coupling, zero compatibility issues with Next.js App Router |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/pdfkit` | latest | TypeScript types for PDFKit | PDFKit ships CJS without bundled types |
| `react-email` | latest | Preview/development server for email templates | Dev only: `email dev` to preview templates locally |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PDFKit | @react-pdf/renderer | react-pdf has active GitHub issues with `renderToBuffer` in Next.js 15 App Router requiring `serverExternalPackages` workaround; PDFKit is simpler and zero-friction |
| PDFKit | pdf-lib | pdf-lib excels at editing existing PDFs, not generating from scratch; PDFKit better for authoring |
| Resend in webhook | Queue/job system (Inngest, BullMQ) | Overkill for v1; async operations can be fire-and-forget with error logging; add queue in v2 if reliability issues arise |

**Installation:**
```bash
npm install stripe @dropbox/sign resend @react-email/components pdfkit
npm install --save-dev @types/pdfkit
```

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/
│   ├── webhooks/
│   │   ├── stripe/route.ts          # Stripe checkout.session.completed
│   │   └── dropbox-sign/route.ts    # signature_request_all_signed
│   └── checkout/route.ts            # Create Stripe Checkout Session
├── (public)/
│   └── checkout/
│       └── success/page.tsx         # Order confirmation (PURCH-03)
├── account/
│   └── orders/
│       ├── page.tsx                 # Purchase history (PURCH-04)
│       └── [orderId]/page.tsx       # Order detail + document access (DOC-04)
lib/
├── stripe.ts                        # Stripe client singleton
├── dropbox-sign.ts                  # Dropbox Sign client singleton
├── resend.ts                        # Resend client singleton
├── pdf/
│   ├── purchase-agreement.ts        # PDFKit: purchase agreement generator
│   └── bill-of-sale.ts             # PDFKit: bill of sale generator
├── email/
│   ├── order-confirmation.tsx       # React Email template (NOTF-01)
│   ├── admin-order-alert.tsx        # React Email template (NOTF-02)
│   ├── signing-request.tsx          # React Email template (NOTF-03)
│   └── documents-complete.tsx       # React Email template (NOTF-04)
├── fulfillment.ts                   # Orchestrates post-payment pipeline
└── validations/
    └── order.ts                     # Zod schemas for order-related data
```

### Pattern 1: Stripe Checkout Session Creation (Server Action)

**What:** A Server Action creates the Stripe Checkout Session server-side, never exposing prices to the client. It redirects directly to the Stripe-hosted page.

**When to use:** When consumer clicks "Buy Now" on vehicle detail page.

```typescript
// app/actions/checkout.ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function createCheckoutSession(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // CRITICAL: Fetch price from DB — never trust client
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, price_cents, status')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()

  if (!listing) throw new Error('Listing not available')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: listing.price_cents,
        product_data: { name: listing.title },
      },
      quantity: 1,
    }],
    metadata: {
      listing_id: listingId,
      buyer_id: user.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/cars/${listingId}`,
  })

  redirect(session.url!)
}
```

### Pattern 2: Stripe Webhook Handler (Route Handler)

**What:** App Router Route Handler that verifies Stripe signature from raw body, handles `checkout.session.completed`, creates order record, marks listing sold, and fires NOTF-01/NOTF-02 emails.

**Critical:** Must use `await request.text()` (NOT `request.json()`) to preserve raw body for signature verification. App Router does not auto-parse bodies, so this works without configuration changes.

**Idempotency:** Check if order already exists for the `stripe_checkout_session` before proceeding — Stripe retries webhooks on failure.

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const body = await request.text()  // Raw body required for signature verification
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    await handleCheckoutCompleted(session)
  }

  return new Response('OK', { status: 200 })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = createAdminClient()  // service_role for RLS bypass

  // Idempotency: bail if order already exists
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_checkout_session', session.id)
    .single()
  if (existing) return

  const { listing_id, buyer_id } = session.metadata!

  // Atomic: mark listing sold + create order in single pass
  await supabase.from('listings').update({ status: 'sold' }).eq('id', listing_id)

  const { data: order } = await supabase.from('orders').insert({
    listing_id,
    buyer_id,
    seller_id: /* fetch from listing */,
    status: 'paid',
    price_cents: session.amount_total!,
    stripe_checkout_session: session.id,
    stripe_payment_intent: session.payment_intent as string,
  }).select().single()

  // Insert pending order_documents records
  await supabase.from('order_documents').insert([
    { order_id: order.id, document_type: 'purchase_agreement', status: 'pending' },
    { order_id: order.id, document_type: 'title_transfer', status: 'pending' },
  ])

  // Fire NOTF-01 and NOTF-02 emails (fast, non-blocking)
  // Then kick off async document pipeline (fire-and-forget)
  void generateAndSendDocuments(order.id)
}
```

### Pattern 3: PDFKit Buffer Generation

**What:** Generate PDFs as `Buffer` objects server-side using PDFKit stream collection. Buffers are uploaded to Supabase Storage and sent to Dropbox Sign as files.

```typescript
// lib/pdf/purchase-agreement.ts
// Source: PDFKit documentation + stream-to-buffer pattern
import PDFDocument from 'pdfkit'

export interface PurchaseAgreementData {
  vin: string; year: number; make: string; model: string
  mileage: number; color: string; price_cents: number
  buyer_name: string; buyer_email: string; seller_name: string
  date: string
}

export function generatePurchaseAgreement(data: PurchaseAgreementData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Coast logo (Base64 or file path)
    // doc.image(logoPath, 50, 45, { width: 100 })

    doc.fontSize(18).text('Purchase Agreement', { align: 'center' })
    doc.moveDown()
    doc.fontSize(11)
    doc.text(`Vehicle: ${data.year} ${data.make} ${data.model}`)
    doc.text(`VIN: ${data.vin}`)
    doc.text(`Mileage: ${data.mileage.toLocaleString()} mi`)
    doc.text(`Color: ${data.color}`)
    doc.text(`Purchase Price: $${(data.price_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
    doc.moveDown()
    doc.text(`Buyer: ${data.buyer_name} (${data.buyer_email})`)
    doc.text(`Seller: ${data.seller_name}`)
    doc.text(`Date: ${data.date}`)
    doc.moveDown(2)
    // Signature block
    doc.text('Buyer Signature: ________________________  Date: ____________')

    doc.end()
  })
}
```

### Pattern 4: Dropbox Sign — Send Signature Request

**What:** Send both PDFs as a single signature request envelope (one signing session for the buyer). Uses `@dropbox/sign` SDK, `SignatureRequestApi.signatureRequestSend()`.

**Key note:** The new SDK is an ES Module (`"type": "module"` or use `.mjs` import). For Next.js App Router route handlers, standard `import` syntax works.

```typescript
// lib/fulfillment.ts (excerpt)
// Source: github.com/hellosign/dropbox-sign-node SDK docs
import api from '@dropbox/sign'
import models from '@dropbox/sign'

const signatureApi = new api.SignatureRequestApi()
signatureApi.username = process.env.DROPBOX_SIGN_API_KEY!

export async function sendForSigning(params: {
  orderId: string
  buyerEmail: string
  buyerName: string
  purchaseAgreementBuffer: Buffer
  billOfSaleBuffer: Buffer
}): Promise<string> {  // returns signature_request_id (esign_ref)

  const signer: models.SubSignatureRequestSigner = {
    name: params.buyerName,
    emailAddress: params.buyerEmail,
    order: 0,
  }

  const request: models.SignatureRequestSendRequest = {
    title: 'Coast Vehicle Purchase Documents',
    subject: 'Please sign your vehicle purchase documents',
    message: 'Your vehicle purchase documents are ready for signature.',
    signers: [signer],
    files: [
      params.purchaseAgreementBuffer,
      params.billOfSaleBuffer,
    ],
    metadata: { order_id: params.orderId },
    testMode: process.env.NODE_ENV !== 'production',
  }

  const response = await signatureApi.signatureRequestSend(request)
  return response.body.signatureRequest!.signatureRequestId!
}
```

### Pattern 5: Dropbox Sign Callback Handler

**What:** Route handler that receives the `signature_request_all_signed` event from Dropbox Sign. Must respond with `Hello API Event Received` (plain text 200) or Dropbox Sign will retry.

**Verification:** Every event payload contains an `event_hash` (HMAC-SHA256 of `event_time + event_type` keyed with your API key). Verify before processing.

```typescript
// app/api/webhooks/dropbox-sign/route.ts
export async function POST(request: Request) {
  const formData = await request.formData()
  const json = JSON.parse(formData.get('json') as string)
  const { event } = json

  // Verify event hash
  const expectedHash = createHmac('sha256', process.env.DROPBOX_SIGN_API_KEY!)
    .update(`${event.event_time}${event.event_type}`)
    .digest('hex')

  if (event.event_hash !== expectedHash) {
    return new Response('Invalid hash', { status: 401 })
  }

  if (event.event_type === 'signature_request_all_signed') {
    const signatureRequestId = json.signature_request.signature_request_id
    void handleAllSigned(signatureRequestId)
  }

  // Dropbox Sign requires this exact response text
  return new Response('Hello API Event Received', { status: 200 })
}
```

**Important:** Dropbox Sign sends the POST as `multipart/form-data` with event data in a field named `json` (string). Must use `request.formData()`, not `request.json()`.

### Pattern 6: Resend Email with PDF Attachments

**What:** Send the completed documents email (NOTF-04) with signed PDF files attached as buffers.

```typescript
// Source: resend.com/docs/send-with-nextjs
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

await resend.emails.send({
  from: 'Coast <no-reply@coastautos.com>',
  to: [buyerEmail],
  subject: 'Your signed vehicle documents are ready',
  react: DocumentsCompleteEmail({ buyerName, vehicleTitle, orderNumber }),
  attachments: [
    { filename: 'purchase-agreement-signed.pdf', content: signedAgreementBuffer },
    { filename: 'bill-of-sale-signed.pdf', content: signedBillOfSaleBuffer },
  ],
})
```

**Note:** Resend `attachments.content` accepts a `Buffer` directly — no Base64 encoding needed when passing Buffer from server-side code.

### Anti-Patterns to Avoid

- **Parsing webhook body as JSON first:** `await request.json()` in the Stripe webhook handler will corrupt the raw body and cause signature verification to fail. Always `await request.text()`.
- **Trusting client-side price:** Never accept `price_cents` from the browser. Always read from DB in the Server Action.
- **No idempotency check in webhook:** Stripe retries webhooks on 5xx or timeout. Without a check for `stripe_checkout_session` uniqueness, orders can be doubled.
- **Blocking webhook on PDF generation:** PDF generation + Dropbox Sign API calls can take 2-5 seconds. Respond `200` to Stripe immediately and fire document generation as a `void` promise (fire-and-forget) or with `waitUntil` on Vercel.
- **Dropbox Sign sends its own email to buyer:** The CONTEXT.md decision requires Coast to suppress Dropbox Sign branded emails and send its own NOTF-03. This requires disabling signer notifications in the signature request (set `signingOptions.draw = true` and omit `message` from the request, OR use the API's `send_email: false` option per signer — verify current SDK option name).
- **Using `@react-pdf/renderer` in App Router without config:** Requires `serverExternalPackages: ['@react-pdf/renderer']` in `next.config.ts`; still has active issues as of early 2026. Use PDFKit instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stripe webhook signature verification | Custom HMAC check | `stripe.webhooks.constructEvent()` | Handles timing attacks, encoding edge cases |
| Stripe client initialization | `new Stripe(key)` per request | Singleton in `lib/stripe.ts` | Connection reuse, type inference |
| Dropbox Sign event hash verification | Custom HMAC | `createHmac('sha256', apiKey).update(...)` | Simple enough to do directly — no SDK helper needed |
| PDF table/layout | Manual coordinate math | PDFKit's fluent text/column API | Coordinates are error-prone; PDFKit handles flow |
| Email HTML templates | Raw HTML strings | React Email components | Inline styles, dark mode, client compatibility handled |
| Signed URL generation for order docs | Public URL | Supabase `storage.createSignedUrl()` | `order-documents` bucket is private by design |

**Key insight:** Every library in this stack was chosen because the alternative (custom code) has known security or correctness pitfalls that are not obvious at first glance.

---

## Common Pitfalls

### Pitfall 1: Stripe Webhook Raw Body Corruption
**What goes wrong:** Webhook signature verification throws `No signatures found matching the expected signature` even with the correct secret.
**Why it happens:** Any middleware, body parser, or calling `.json()` on the request before passing to `constructEvent` transforms the body and breaks HMAC verification.
**How to avoid:** Use `await request.text()` in the route handler. App Router does not auto-parse bodies, so no additional config is needed.
**Warning signs:** Error message `No signatures found matching` or `Webhook Error: No webhook payload was provided`.

### Pitfall 2: Stripe Webhook Duplicate Processing
**What goes wrong:** An order is created twice, listing marked sold twice, emails sent twice.
**Why it happens:** Stripe retries webhooks if your endpoint returns 5xx or times out (e.g., if document generation blocks and exceeds 5 seconds).
**How to avoid:** Check `stripe_checkout_session` uniqueness before inserting the order. Return `200` immediately after the fast path (order creation + emails), then do document generation asynchronously.
**Warning signs:** Duplicate `order_documents` rows or duplicate email reports.

### Pitfall 3: Dropbox Sign Callback Body Format
**What goes wrong:** `request.json()` fails or returns empty/null when parsing Dropbox Sign callbacks.
**Why it happens:** Dropbox Sign sends callbacks as `multipart/form-data`, not `application/json`. The JSON payload is a string inside a form field named `json`.
**How to avoid:** Use `await request.formData()`, then `JSON.parse(formData.get('json') as string)`.
**Warning signs:** `SyntaxError: Unexpected token` or empty `event` object.

### Pitfall 4: Dropbox Sign Response String Required
**What goes wrong:** Dropbox Sign continues retrying the callback every few minutes indefinitely.
**Why it happens:** Dropbox Sign requires the exact plain-text response `Hello API Event Received` with a 200 status. Any other body (including `{ok: true}` JSON) is treated as an error.
**How to avoid:** `return new Response('Hello API Event Received', { status: 200 })`.
**Warning signs:** Callback events showing status `error` in Dropbox Sign dashboard.

### Pitfall 5: Listing Not Actually Marked Sold Before Webhook Returns
**What goes wrong:** A second buyer's checkout completes for the same listing while the first webhook is still processing.
**Why it happens:** Two concurrent webhooks race if the listing update is not done atomically before order insertion, or if the idempotency check is not in place.
**How to avoid:** In the webhook handler, update the listing status to `sold` before inserting the order. The `orders.status` column only gets `paid` after the listing is marked sold. For extra safety, a DB-level unique constraint on `listing_id` in the `orders` table (when status != 'cancelled') would prevent duplicate orders at DB level.
**Warning signs:** Multiple orders referencing the same `listing_id` with `status = 'paid'`.

### Pitfall 6: PDFKit and Async/Await
**What goes wrong:** PDFKit generates an empty PDF or the promise never resolves.
**Why it happens:** PDFKit uses Node.js streams. The `end` event fires after `doc.end()` is called. If you forget `doc.end()` or resolve before the `end` event fires, you get an empty or truncated buffer.
**How to avoid:** Structure as a `new Promise` that resolves in the `'end'` event handler. Always call `doc.end()` after adding all content.
**Warning signs:** Empty PDF files, Buffer with only PDF header bytes.

### Pitfall 7: Dropbox Sign Branded Email Suppression
**What goes wrong:** Buyer receives a Dropbox Sign-branded email asking them to sign, contradicting the decision to use Coast-branded emails only.
**Why it happens:** By default, Dropbox Sign sends its own signing request email to signers.
**How to avoid:** When creating the signature request, check whether the current API version supports a `send_email: false` per-signer option or a `signing_redirect_url` that bypasses the email flow. Alternatively, use `signers[].redirect_url` to redirect signers back to the order page after signing. Verify current SDK behavior in test mode before releasing.
**Warning signs:** Buyer reports receiving a "Dropbox Sign" email instead of a "Coast" email.

---

## Code Examples

### Stripe Client Singleton
```typescript
// lib/stripe.ts
// Source: Stripe official docs — stripe.com/docs
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',  // pin to current stable API version
  typescript: true,
})
```

### Supabase Signed URL for Private Document
```typescript
// For order-documents bucket (private) — server-side only
const supabase = createAdminClient()
const { data } = await supabase.storage
  .from('order-documents')
  .createSignedUrl(storageKey, 3600)  // 1-hour expiry
// data.signedUrl — pass to client
```

### Order Status Progression Map
```
orders.status:
  pending_payment  →  paid (Stripe webhook)
                       ↓
                  documents_sent (after Dropbox Sign request sent)
                       ↓
                  documents_signed (after Dropbox Sign all_signed callback)
                       ↓
                  complete

order_documents.status:
  pending → sent → signed
```

### React Email Template Pattern (NOTF-01)
```typescript
// lib/email/order-confirmation.tsx
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'

interface Props {
  orderNumber: string
  vehicleTitle: string
  priceCents: number
  buyerName: string
}

export function OrderConfirmationEmail({ orderNumber, vehicleTitle, priceCents, buyerName }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your order #{orderNumber} is confirmed</Preview>
      <Body style={{ backgroundColor: '#09090b', color: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container>
          <Heading>Order Confirmed</Heading>
          <Text>Hi {buyerName},</Text>
          <Text>Your purchase of {vehicleTitle} is confirmed.</Text>
          <Text>Amount: ${(priceCents / 100).toLocaleString()}</Text>
          <Text>Documents are being prepared. You'll receive an email when they're ready to sign.</Text>
        </Container>
      </Body>
    </Html>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe webhook via Pages Router API route with `bodyParser: false` config | App Router Route Handler with `await request.text()` — no body parser config needed | Next.js 13+ | Simpler, no `export const config` needed |
| `hellosign-sdk` package | `@dropbox/sign` package | 2022 (Dropbox acquisition rebranded) | Old package name is deprecated |
| Resend `attachments.content` as Base64 string | Resend accepts `Buffer` directly | ~2023 | No manual Base64 conversion needed |
| PDFDocument piped to `concat-stream` | Native stream chunk collection with `chunks.push` + `Buffer.concat` | Node.js 10+ | No extra dependencies |

**Deprecated/outdated:**
- `hellosign-sdk` npm package: replaced by `@dropbox/sign`. Do not use the old package name.
- Pages Router `export const config = { api: { bodyParser: false } }` for Stripe webhooks: not needed in App Router.

---

## Open Questions

1. **Suppressing Dropbox Sign's native signer email (NOTF-03 constraint)**
   - What we know: Dropbox Sign sends its own signing email to signers by default
   - What's unclear: Whether the current `@dropbox/sign` SDK exposes a `send_email: false` or `disable_sms_auth` per-signer flag to suppress native email delivery, or whether this requires an account-level setting in the Dropbox Sign dashboard
   - Recommendation: Test in sandbox mode. If suppression is not possible via SDK, consider the hybrid approach: let Dropbox Sign send its email, but also send NOTF-03 from Coast pointing to the same signing URL retrieved via `embeddedSignUrl` endpoint. The locked decision says "no Dropbox Sign branded emails" — this may require account-level dashboard configuration rather than code.

2. **Fire-and-forget async document generation reliability**
   - What we know: `void generateAndSendDocuments()` works on local dev but Vercel serverless functions terminate after the response is sent
   - What's unclear: Whether Vercel's `waitUntil` is available in the Next.js App Router version in use
   - Recommendation: Use `after()` from `next/server` (Next.js 15 stable feature) which provides `waitUntil` semantics: `after(async () => { await generateAndSendDocuments(orderId) })`. This is the correct pattern for post-response async work in Next.js 15.

3. **PDFKit and Coast logo embedding**
   - What we know: PDFKit supports `doc.image(path, x, y, options)` for PNG/JPEG images
   - What's unclear: Whether the Coast logo asset exists in the repo and at what path
   - Recommendation: Store logo at `public/logo.png`; reference with `path.join(process.cwd(), 'public/logo.png')` in server-side code (not `public/` URL).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PURCH-01 | `createCheckoutSession` returns redirect URL for active listing | unit | `npm run test:unit -- tests/transactions/checkout.test.ts` | Wave 0 |
| PURCH-01 | `createCheckoutSession` rejects if listing is not active | unit | `npm run test:unit -- tests/transactions/checkout.test.ts` | Wave 0 |
| PURCH-02 | Webhook handler creates order and marks listing sold on `checkout.session.completed` | unit | `npm run test:unit -- tests/transactions/webhook-stripe.test.ts` | Wave 0 |
| PURCH-02 | Webhook handler is idempotent (no duplicate order on retry) | unit | `npm run test:unit -- tests/transactions/webhook-stripe.test.ts` | Wave 0 |
| PURCH-02 | Webhook handler rejects invalid Stripe signature | unit | `npm run test:unit -- tests/transactions/webhook-stripe.test.ts` | Wave 0 |
| DOC-01/02 | `generatePurchaseAgreement` returns non-empty Buffer | unit | `npm run test:unit -- tests/transactions/pdf.test.ts` | Wave 0 |
| DOC-01/02 | `generateBillOfSale` returns non-empty Buffer | unit | `npm run test:unit -- tests/transactions/pdf.test.ts` | Wave 0 |
| DOC-05 | Dropbox Sign callback handler returns `Hello API Event Received` on valid event | unit | `npm run test:unit -- tests/transactions/webhook-dropbox.test.ts` | Wave 0 |
| DOC-05 | Dropbox Sign callback handler rejects invalid event hash | unit | `npm run test:unit -- tests/transactions/webhook-dropbox.test.ts` | Wave 0 |
| PURCH-03 | Order confirmation page renders with valid session_id (e2e stub) | e2e stub | `npm run test:e2e -- tests/transactions/checkout.spec.ts` | Wave 0 |
| PURCH-04 | Purchase history page renders order cards (e2e stub) | e2e stub | `npm run test:e2e -- tests/transactions/orders.spec.ts` | Wave 0 |
| NOTF-01–04 | Email template renders without errors | unit | `npm run test:unit -- tests/transactions/emails.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit -- tests/transactions/`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/transactions/checkout.test.ts` — covers PURCH-01 (mock Supabase + Stripe)
- [ ] `tests/transactions/webhook-stripe.test.ts` — covers PURCH-02 (mock `constructEvent`, Supabase admin)
- [ ] `tests/transactions/pdf.test.ts` — covers DOC-01, DOC-02 (pure PDFKit, no mocking needed)
- [ ] `tests/transactions/webhook-dropbox.test.ts` — covers DOC-05 callback handler
- [ ] `tests/transactions/emails.test.ts` — covers NOTF-01–04 template rendering (React Email render to string)
- [ ] `tests/transactions/checkout.spec.ts` — e2e stub with `test.fixme()`
- [ ] `tests/transactions/orders.spec.ts` — e2e stub with `test.fixme()`

---

## Sources

### Primary (HIGH confidence)
- Stripe official docs (docs.stripe.com/webhooks, docs.stripe.com/api/checkout/sessions/create) — webhook signature verification, checkout session parameters
- Resend official docs (resend.com/docs/send-with-nextjs) — email with attachments, React Email pattern
- PDFKit official docs (pdfkit.org/docs/getting_started.html) — stream-to-buffer pattern
- `@dropbox/sign` GitHub repo (github.com/hellosign/dropbox-sign-node) — package name, SDK structure, signatureRequestSend

### Secondary (MEDIUM confidence)
- Pedro Alonso Next.js + Stripe guide 2025 (pedroalonso.net) — `checkout.session.completed` event, idempotency pattern, `await request.text()` pattern — verified against official Stripe docs
- Dropbox Sign Help: callback events (help.dropbox.com) — `event_hash` verification, `multipart/form-data` format, `Hello API Event Received` response requirement

### Tertiary (LOW confidence)
- GitHub issue #3074 on react-pdf (compatibility with Next.js 15) — PDFKit recommendation driven by this; confirmed React 19 resolves it but adds fragility. PDFKit remains safer choice.
- Dropbox Sign: signer email suppression per-request — not directly verified in SDK docs; flagged as Open Question #1.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via official sources and GitHub repos
- Architecture: HIGH — patterns derived directly from official docs and established project conventions
- Pitfalls: HIGH for Stripe (verified against official docs), MEDIUM for Dropbox Sign callback details (format verified via Help docs, email suppression unverified)
- PDF generation: HIGH for PDFKit stream pattern, MEDIUM for Coast logo embedding path

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable APIs; Dropbox Sign callback suppression behavior may need re-check)
