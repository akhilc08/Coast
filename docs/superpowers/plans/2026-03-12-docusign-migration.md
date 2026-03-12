# DocuSign eSignature Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Dropbox Sign with DocuSign eSignature API across the entire document signing pipeline.

**Architecture:** Create `lib/docusign.ts` as a server-only JWT auth client with token caching; update `lib/fulfillment.ts` to create DocuSign envelopes instead of Dropbox Sign requests; replace the Dropbox Sign webhook handler with a DocuSign Connect handler that verifies HMAC against the raw request body. PDF generators get white-text anchor strings so DocuSign auto-places signature/date tabs.

**Tech Stack:** `docusign-esign` SDK (named imports only — package has no default export), Next.js API routes, Supabase admin client, PDFKit, Resend

---

## Chunk 1: Dependencies + DocuSign Client

### Task 1: Swap packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove Dropbox Sign, add DocuSign SDK**

```bash
npm uninstall @dropbox/sign
npm install docusign-esign
npm install --save-dev @types/docusign-esign
```

- [ ] **Step 2: Verify install**

```bash
npm ls docusign-esign
```
Expected: `docusign-esign@x.x.x` with no peer dep errors

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap @dropbox/sign for docusign-esign"
```

---

### Task 2: Create `lib/docusign.ts` — JWT auth client

**Files:**
- Create: `lib/docusign.ts`

Note: `docusign-esign` uses named exports only — `import docusign from 'docusign-esign'` resolves to `undefined`. Always use named imports.

- [ ] **Step 1: Create the file**

```typescript
// lib/docusign.ts
// NEVER import this file in client-side code.
// DocuSign credentials must NOT be prefixed with NEXT_PUBLIC_.
import { ApiClient, EnvelopesApi } from 'docusign-esign'

const SCOPES = ['signature', 'impersonation']
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry
// Note: these module-level variables are reset on every serverless cold start.
// Token caching only benefits warm instances.
let cachedToken: string | null = null
let tokenExpiresAt: number = 0

/**
 * Returns a valid DocuSign access token, using a cached one if still fresh.
 * DocuSign JWT tokens have a 1-hour TTL; we refresh 5 minutes early.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken
  }

  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY!
  const userId = process.env.DOCUSIGN_USER_ID!
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY!.replace(/\\n/g, '\n')
  const authServer = process.env.DOCUSIGN_AUTH_SERVER!

  const apiClient = new ApiClient()
  apiClient.setOAuthBasePath(authServer)

  const results = await apiClient.requestJWTUserToken(
    integrationKey,
    userId,
    SCOPES,
    Buffer.from(privateKey),
    3600
  )

  cachedToken = results.body.access_token
  tokenExpiresAt = now + results.body.expires_in * 1000
  return cachedToken!
}

/**
 * Returns a configured DocuSign ApiClient with a valid access token set.
 */
export async function getApiClient(): Promise<ApiClient> {
  const token = await getAccessToken()
  const baseUrl = process.env.DOCUSIGN_BASE_URL!

  const apiClient = new ApiClient()
  apiClient.setBasePath(`https://${baseUrl}/restapi`)
  apiClient.addDefaultHeader('Authorization', `Bearer ${token}`)
  return apiClient
}

/**
 * Returns a configured EnvelopesApi instance.
 */
export async function getEnvelopesApi(): Promise<EnvelopesApi> {
  const apiClient = await getApiClient()
  return new EnvelopesApi(apiClient)
}

/** Constant documentId mapping — must match fulfillment.ts and webhook handler */
export const DOCUMENT_IDS = {
  purchase_agreement: '1',
  title_transfer: '2',
} as const
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors on `lib/docusign.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/docusign.ts
git commit -m "feat: add DocuSign JWT auth client with token caching"
```

---

## Chunk 2: PDF Anchor Strings

### Task 3: Add anchor strings to purchase agreement PDF

**Files:**
- Modify: `lib/pdf/purchase-agreement.ts`

- [ ] **Step 1: Replace the buyer signature block**

Find (lines 117–122):
```typescript
    doc
      .fontSize(11)
      .font('Helvetica')
      .text('Buyer Signature: _______________________________    Date: _______________')
      .moveDown(0.5)
      .text(`Print Name: ${data.buyerName}`)
```

Replace with:
```typescript
    // Buyer signature block — anchor strings in white text (invisible to reader,
    // detected by DocuSign to auto-place signature and date tabs)
    doc
      .fontSize(11)
      .font('Helvetica')
      .text('Buyer Signature: _______________________________', { continued: true })
      .fillColor('white')
      .text('{{BUYER_SIGNATURE}}', { continued: true })
      .fillColor('black')
      .text('    Date: _______________', { continued: true })
      .fillColor('white')
      .text('{{BUYER_DATE}}')
      .fillColor('black')
      .moveDown(0.5)
      .text(`Print Name: ${data.buyerName}`)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/pdf/purchase-agreement.ts
git commit -m "feat: add DocuSign anchor strings to purchase agreement PDF"
```

---

### Task 4: Add anchor strings to bill of sale PDF

**Files:**
- Modify: `lib/pdf/bill-of-sale.ts`

- [ ] **Step 1: Replace the buyer signature block**

Find (lines 129–133):
```typescript
      .text('Buyer Signature: _______________________________    Date: _______________')
      .moveDown(0.5)
      .text(`Print Name: ${data.buyerName}`)
```

Replace with:
```typescript
      // Buyer signature block — anchor strings in white text for DocuSign tab placement
      .text('Buyer Signature: _______________________________', { continued: true })
      .fillColor('white')
      .text('{{BUYER_SIGNATURE}}', { continued: true })
      .fillColor('black')
      .text('    Date: _______________', { continued: true })
      .fillColor('white')
      .text('{{BUYER_DATE}}')
      .fillColor('black')
      .moveDown(0.5)
      .text(`Print Name: ${data.buyerName}`)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/pdf/bill-of-sale.ts
git commit -m "feat: add DocuSign anchor strings to bill of sale PDF"
```

---

## Chunk 3: Fulfillment Pipeline

### Task 5: Update `lib/fulfillment.ts` — replace Dropbox Sign with DocuSign

**Files:**
- Modify: `lib/fulfillment.ts`

Note: All DocuSign model objects are built as plain TypeScript object literals typed against named interface imports. Do NOT use `.constructFromObject()` — it is a runtime JS pattern not reflected in the `@types/docusign-esign` type declarations.

- [ ] **Step 1: Replace the entire file**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { getEnvelopesApi, DOCUMENT_IDS } from '@/lib/docusign'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { generatePurchaseAgreement } from '@/lib/pdf/purchase-agreement'
import { generateBillOfSale } from '@/lib/pdf/bill-of-sale'
import { SigningRequestEmail } from '@/lib/email/signing-request'
import { render } from '@react-email/components'
import * as React from 'react'
import type {
  Document,
  SignHere,
  DateSigned,
  Signer,
  Tabs,
  Recipients,
  EnvelopeDefinition,
} from 'docusign-esign'

/**
 * Post-payment document pipeline orchestrator.
 *
 * Called asynchronously (fire-and-forget) from the Stripe webhook via after().
 * Steps:
 *  1. Fetch order with listing and buyer/seller profiles
 *  2. Generate purchase agreement and bill of sale PDFs
 *  3. Upload both to `order-documents` bucket
 *  4. Update order_documents rows with storage_key
 *  5. Send to DocuSign (single envelope, buyer as signer, two documents)
 *  6. Store esign_ref (envelope ID) on both order_documents rows
 *  7. Update order_documents status to 'sent'
 *  8. Update orders.status to 'documents_sent'
 *  9. Send NOTF-03 (signing request notification) via Resend
 */
export async function generateAndSendDocuments(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // --- Step 1: Fetch order data ---
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, listing_id, buyer_id, seller_id, price_cents')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[fulfillment] Failed to fetch order', orderId, orderError)
      return
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('title, vin, year, make, model, mileage, exterior_color')
      .eq('id', order.listing_id)
      .single()

    if (listingError || !listing) {
      console.error('[fulfillment] Failed to fetch listing for order', orderId, listingError)
      return
    }

    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select('full_name, email, business_name')
      .eq('id', order.buyer_id)
      .single()

    if (buyerError || !buyer) {
      console.error('[fulfillment] Failed to fetch buyer profile for order', orderId, buyerError)
      return
    }

    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', order.seller_id)
      .single()

    if (sellerError || !seller) {
      console.error('[fulfillment] Failed to fetch seller profile for order', orderId, sellerError)
      return
    }

    const orderNumber = orderId.slice(0, 8).toUpperCase()
    const today = new Date().toISOString().slice(0, 10)
    const buyerName = buyer.full_name ?? buyer.email ?? 'Buyer'
    const sellerName = seller.business_name ?? seller.full_name ?? 'Seller'
    const vehicleTitle =
      listing.title ??
      [listing.year, listing.make, listing.model].filter(Boolean).join(' ') ??
      'Vehicle'

    const docData = {
      vin: listing.vin ?? '',
      year: listing.year ?? 0,
      make: listing.make ?? '',
      model: listing.model ?? '',
      mileage: listing.mileage ?? 0,
      color: listing.exterior_color ?? '',
      priceCents: order.price_cents ?? 0,
      buyerName,
      buyerEmail: buyer.email ?? '',
      sellerName,
      date: today,
      orderNumber,
    }

    // --- Step 2: Generate PDFs ---
    const [purchaseAgreementBuffer, billOfSaleBuffer] = await Promise.all([
      generatePurchaseAgreement(docData),
      generateBillOfSale(docData),
    ])

    // --- Step 3: Upload PDFs to order-documents bucket ---
    const paKey = `${orderId}/purchase-agreement.pdf`
    const bosKey = `${orderId}/bill-of-sale.pdf`

    const [paUpload, bosUpload] = await Promise.all([
      supabase.storage.from('order-documents').upload(paKey, purchaseAgreementBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      }),
      supabase.storage.from('order-documents').upload(bosKey, billOfSaleBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      }),
    ])

    if (paUpload.error) {
      console.error('[fulfillment] Failed to upload purchase agreement', orderId, paUpload.error)
    }
    if (bosUpload.error) {
      console.error('[fulfillment] Failed to upload bill of sale', orderId, bosUpload.error)
    }

    // --- Step 4: Update order_documents rows with storage_key ---
    await Promise.all([
      supabase
        .from('order_documents')
        .update({ storage_key: paKey })
        .eq('order_id', orderId)
        .eq('document_type', 'purchase_agreement'),
      supabase
        .from('order_documents')
        .update({ storage_key: bosKey })
        .eq('order_id', orderId)
        .eq('document_type', 'title_transfer'),
    ])

    // --- Step 5: Send to DocuSign ---
    // Both documents use anchor string tabs ({{BUYER_SIGNATURE}}, {{BUYER_DATE}}).
    // DocuSign searches all documents in the envelope for these anchors — no
    // documentId scoping needed on the tabs. Both PDFs contain the anchors, so
    // both will receive signature and date tabs as intended.
    const paDoc: Document = {
      documentBase64: purchaseAgreementBuffer.toString('base64'),
      name: 'Purchase Agreement',
      fileExtension: 'pdf',
      documentId: DOCUMENT_IDS.purchase_agreement,
    }

    const bosDoc: Document = {
      documentBase64: billOfSaleBuffer.toString('base64'),
      name: 'Bill of Sale',
      fileExtension: 'pdf',
      documentId: DOCUMENT_IDS.title_transfer,
    }

    const signHere: SignHere = {
      anchorString: '{{BUYER_SIGNATURE}}',
      anchorUnits: 'pixels',
      anchorXOffset: '0',
      anchorYOffset: '0',
    }

    const dateSigned: DateSigned = {
      anchorString: '{{BUYER_DATE}}',
      anchorUnits: 'pixels',
      anchorXOffset: '0',
      anchorYOffset: '0',
    }

    const tabs: Tabs = {
      signHereTabs: [signHere],
      dateSignedTabs: [dateSigned],
    }

    const signer: Signer = {
      email: buyer.email ?? '',
      name: buyerName,
      recipientId: '1',
      tabs,
    }

    const recipients: Recipients = { signers: [signer] }

    const envelopeDef: EnvelopeDefinition = {
      emailSubject: `Please sign your vehicle purchase documents — ${vehicleTitle}`,
      emailBlurb: 'Your vehicle purchase documents are ready for your signature.',
      documents: [paDoc, bosDoc],
      recipients,
      status: 'sent',
    }

    let envelopeId: string | undefined
    try {
      const accountId = process.env.DOCUSIGN_ACCOUNT_ID!
      const envelopesApi = await getEnvelopesApi()
      const result = await envelopesApi.createEnvelope(accountId, {
        envelopeDefinition: envelopeDef,
      })
      envelopeId = result.envelopeId ?? undefined
    } catch (err) {
      console.error('[fulfillment] DocuSign API error for order', orderId, err)
      // Continue — log error but don't abort the pipeline. envelopeId will be undefined.
    }

    // --- Steps 6 & 7: Update order_documents with esign_ref and status 'sent' ---
    const docUpdate: Record<string, unknown> = { status: 'sent' }
    if (envelopeId) {
      docUpdate.esign_ref = envelopeId
    }

    await supabase
      .from('order_documents')
      .update(docUpdate)
      .eq('order_id', orderId)

    // --- Step 8: Update orders.status to 'documents_sent' ---
    await supabase
      .from('orders')
      .update({ status: 'documents_sent' })
      .eq('id', orderId)

    // --- Step 9: Send NOTF-03 (signing request notification) ---
    const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'https://coastautos.com'
    const orderUrl = `${baseUrl}/account/orders/${orderId}`

    await resend.emails.send({
      from: FROM_EMAIL,
      to: buyer.email ?? '',
      subject: `Your documents are ready to sign — ${vehicleTitle}`,
      html: await render(
        React.createElement(SigningRequestEmail, {
          buyerName,
          vehicleTitle,
          orderNumber,
          orderUrl,
        })
      ),
    })
  } catch (err) {
    console.error('[fulfillment] Unhandled error in generateAndSendDocuments for order', orderId, err)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/fulfillment.ts
git commit -m "feat: replace Dropbox Sign with DocuSign envelope creation in fulfillment pipeline"
```

---

## Chunk 4: DocuSign Webhook Handler

### Task 6: Create `app/api/webhooks/docusign/route.ts`

**Files:**
- Create: `app/api/webhooks/docusign/route.ts`

Note on HMAC: DocuSign signs the full raw request body (not `event_time + event_type`). Output is base64-encoded (not hex). Header is `X-DocuSign-Signature-1`. Use `timingSafeEqual` for comparison.

- [ ] **Step 1: Create the webhook handler**

```typescript
// app/api/webhooks/docusign/route.ts
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEnvelopesApi, DOCUMENT_IDS } from '@/lib/docusign'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { DocumentsCompleteEmail } from '@/lib/email/documents-complete'
import { render } from '@react-email/components'
import * as React from 'react'

/**
 * DocuSign Connect webhook handler.
 *
 * Verification: HMAC-SHA256 over the raw request body, base64-encoded,
 * compared (timing-safe) to X-DocuSign-Signature-1 header.
 *
 * Handles:
 *   envelope-completed: download signed PDFs per documentId, update DB, send NOTF-04
 *   envelope-voided:    log and acknowledge (no DB change)
 *   all others:         acknowledge with 200 (DocuSign retries on non-2xx)
 */
export async function POST(request: Request) {
  // Read raw body BEFORE any parsing — required for HMAC verification
  const rawBody = Buffer.from(await request.arrayBuffer())

  // --- Verify HMAC-SHA256 signature (timing-safe) ---
  const connectSecret = process.env.DOCUSIGN_CONNECT_SECRET ?? ''
  const expectedSig = createHmac('sha256', connectSecret).update(rawBody).digest('base64')
  const receivedSig = request.headers.get('X-DocuSign-Signature-1') ?? ''

  const expectedBuf = Buffer.from(expectedSig)
  const receivedBuf = Buffer.from(receivedSig)
  const sigValid =
    expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf)

  if (!sigValid) {
    console.error('[docusign-webhook] Invalid HMAC signature')
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: {
    event?: string
    data?: { envelopeId?: string }
  }

  try {
    payload = JSON.parse(rawBody.toString('utf-8'))
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const event = payload?.event
  const envelopeId = payload?.data?.envelopeId

  if (event === 'envelope-completed' && envelopeId) {
    void handleEnvelopeCompleted(envelopeId)
  } else if (event === 'envelope-voided') {
    console.warn('[docusign-webhook] Received envelope-voided for envelope', envelopeId)
  }

  return new Response('OK', { status: 200 })
}

async function handleEnvelopeCompleted(envelopeId: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID!

    // --- Find order_documents by esign_ref ---
    const { data: docs, error: docsError } = await supabase
      .from('order_documents')
      .select('id, order_id, document_type, storage_key')
      .eq('esign_ref', envelopeId)

    if (docsError || !docs || docs.length === 0) {
      console.error('[docusign-webhook] No order_documents found for envelope', envelopeId, docsError)
      return
    }

    const orderId = docs[0].order_id

    // --- Fetch order, buyer, and listing ---
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id, listing_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[docusign-webhook] Order not found for id', orderId, orderError)
      return
    }

    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', order.buyer_id)
      .single()

    if (buyerError || !buyer) {
      console.error('[docusign-webhook] Buyer profile not found for order', orderId, buyerError)
      return
    }

    let vehicleTitle = 'Vehicle'
    const { data: listing } = await supabase
      .from('listings')
      .select('title, year, make, model')
      .eq('id', order.listing_id)
      .single()

    if (listing) {
      vehicleTitle =
        listing.title ??
        [listing.year, listing.make, listing.model].filter(Boolean).join(' ') ??
        'Vehicle'
    }

    // --- Download signed PDFs from DocuSign, one call per documentId ---
    const envelopesApi = await getEnvelopesApi()
    const signedAt = new Date().toISOString()
    const orderNumber = orderId.slice(0, 8).toUpperCase()
    const attachments: Array<{ filename: string; content: Buffer }> = []

    for (const doc of docs) {
      const documentId = DOCUMENT_IDS[doc.document_type as keyof typeof DOCUMENT_IDS]
      if (!documentId) {
        console.warn('[docusign-webhook] Unknown document_type', doc.document_type)
        continue
      }

      let signedBuffer: Buffer | null = null
      try {
        // getDocument returns a Buffer for PDF responses at runtime;
        // types declare it as string so we normalize both cases
        const response = await envelopesApi.getDocument(accountId, envelopeId, documentId)
        signedBuffer = Buffer.isBuffer(response)
          ? response
          : Buffer.from(response as string, 'binary')
      } catch (err) {
        console.error('[docusign-webhook] Failed to download document', documentId, envelopeId, err)
      }

      const signedKey = doc.storage_key
        ? doc.storage_key.replace(/\.pdf$/, '-signed.pdf')
        : `${orderId}/${doc.document_type}-signed.pdf`

      if (signedBuffer) {
        const { error: uploadError } = await supabase.storage
          .from('order-documents')
          .upload(signedKey, signedBuffer, { contentType: 'application/pdf', upsert: true })

        if (uploadError) {
          console.error('[docusign-webhook] Failed to upload signed PDF', signedKey, uploadError)
        }
      }

      await supabase
        .from('order_documents')
        .update({
          status: 'signed',
          signed_at: signedAt,
          signer_id: order.buyer_id,
          storage_key: signedBuffer ? signedKey : doc.storage_key,
        })
        .eq('id', doc.id)

      if (signedBuffer) {
        const filename =
          doc.document_type === 'purchase_agreement'
            ? 'purchase-agreement-signed.pdf'
            : 'bill-of-sale-signed.pdf'
        attachments.push({ filename, content: signedBuffer })
      }
    }

    // --- Update orders.status to 'documents_signed' ---
    await supabase
      .from('orders')
      .update({ status: 'documents_signed' })
      .eq('id', orderId)

    // --- Send NOTF-04: documents complete email ---
    const buyerName = buyer.full_name ?? buyer.email ?? 'Valued Customer'

    await resend.emails.send({
      from: FROM_EMAIL,
      to: buyer.email ?? '',
      subject: `Your signed documents are ready — ${vehicleTitle}`,
      html: await render(
        React.createElement(DocumentsCompleteEmail, {
          buyerName,
          vehicleTitle,
          orderNumber,
        })
      ),
      attachments: attachments.length > 0 ? attachments : undefined,
    })
  } catch (err) {
    console.error('[docusign-webhook] Unhandled error in handleEnvelopeCompleted', envelopeId, err)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/docusign/route.ts
git commit -m "feat: add DocuSign Connect webhook handler with HMAC verification"
```

---

## Chunk 5: Cleanup

### Task 7: Delete old Dropbox Sign files and update env vars

**Files:**
- Delete: `lib/dropbox-sign.ts`
- Delete: `app/api/webhooks/dropbox-sign/route.ts`
- Modify: `.env.local`

- [ ] **Step 1: Delete Dropbox Sign files**

```bash
rm lib/dropbox-sign.ts
rm -r app/api/webhooks/dropbox-sign
```

- [ ] **Step 2: Verify no remaining Dropbox Sign imports**

```bash
npx tsc --noEmit && grep -r "dropbox" . --include="*.ts" --include="*.tsx" -l
```
Expected: tsc exits 0, grep finds no files

- [ ] **Step 3: Update `.env.local`**

Remove:
```
DROPBOX_SIGN_API_KEY=placeholder
```

Add:
```
# DocuSign eSignature
DOCUSIGN_INTEGRATION_KEY=your_integration_key_here
DOCUSIGN_USER_ID=your_user_guid_here
DOCUSIGN_ACCOUNT_ID=your_account_id_here
DOCUSIGN_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
DOCUSIGN_BASE_URL=demo.docusign.net
DOCUSIGN_AUTH_SERVER=account-d.docusign.com
DOCUSIGN_CONNECT_SECRET=your_connect_hmac_secret_here
```

- [ ] **Step 4: Verify build succeeds**

```bash
npm run build
```
Expected: build succeeds with no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove Dropbox Sign, add DocuSign env vars"
```

---

## Post-Implementation Checklist

Before going to production:

- [ ] Complete one-time JWT consent grant in DocuSign developer console
- [ ] Configure DocuSign Connect subscription in admin console → `/api/webhooks/docusign`, enable HMAC, select `envelope-completed` + `envelope-voided`
- [ ] Verify anchor tab placement end-to-end in DocuSign sandbox
- [ ] Obtain production `DOCUSIGN_BASE_URL` from `GET https://account.docusign.com/oauth/userinfo` → `accounts[].base_uri`
- [ ] Swap sandbox env vars for production values
