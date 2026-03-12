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
  const connectSecret = process.env.DOCUSIGN_CONNECT_SECRET
  if (!connectSecret) {
    console.error('[docusign-webhook] DOCUSIGN_CONNECT_SECRET is not set')
    return new Response('Internal Server Error', { status: 500 })
  }
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
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID
    if (!accountId) {
      console.error('[docusign-webhook] DOCUSIGN_ACCOUNT_ID is not set')
      return
    }

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
        const response = await envelopesApi.getDocument(accountId, envelopeId, documentId, {})
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

      if (signedBuffer) {
        await supabase
          .from('order_documents')
          .update({
            status: 'signed',
            signed_at: signedAt,
            signer_id: order.buyer_id,
            storage_key: signedKey,
          })
          .eq('id', doc.id)
      } else {
        console.error('[docusign-webhook] Skipping status update for doc — no signed buffer', doc.id)
      }

      if (signedBuffer) {
        const filename =
          doc.document_type === 'purchase_agreement'
            ? 'purchase-agreement-signed.pdf'
            : 'bill-of-sale-signed.pdf'
        attachments.push({ filename, content: signedBuffer })
      }
    }

    // --- Update orders.status and send NOTF-04 only if downloads succeeded ---
    // If all downloads failed, leave status as 'documents_sent' for recovery
    // and do not email the buyer a false success notification.
    if (attachments.length > 0) {
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
        attachments,
      })
    } else {
      console.error('[docusign-webhook] No signed attachments collected for order', orderId, '— order status not advanced, NOTF-04 not sent')
    }
  } catch (err) {
    console.error('[docusign-webhook] Unhandled error in handleEnvelopeCompleted', envelopeId, err)
  }
}
