// app/api/webhooks/dropboxsign/route.ts
import { EventCallbackHelper } from '@dropbox/sign'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSignatureRequestApi } from '@/lib/dropboxsign'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { DocumentsCompleteEmail } from '@/lib/email/documents-complete'
import { render } from '@react-email/components'
import * as React from 'react'

/**
 * Dropbox Sign event callback handler.
 *
 * Verification: HMAC-SHA256 of (event_time + event_type) keyed with the API key,
 * compared (timing-safe) to event.event_hash via EventCallbackHelper.isValid().
 *
 * Handles:
 *   signature_request_all_signed: download signed PDF, update DB, send NOTF-04
 *   all others: acknowledge with 200
 *
 * Must respond with exactly "Hello API Event Received" to acknowledge.
 */
export async function POST(request: Request) {
  const apiKey = process.env.DROPBOX_SIGN_API_KEY
  if (!apiKey) {
    console.error('[dropboxsign-webhook] DROPBOX_SIGN_API_KEY is not set')
    return new Response('Internal Server Error', { status: 500 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  // Verify the event using the SDK helper
  if (!EventCallbackHelper.isValid(apiKey, payload as unknown as Parameters<typeof EventCallbackHelper.isValid>[1])) {
    console.error('[dropboxsign-webhook] Invalid event signature')
    return new Response('Unauthorized', { status: 401 })
  }

  const eventType        = (payload?.event as Record<string, unknown>)?.event_type as string | undefined
  const signatureRequest = payload?.signature_request as Record<string, unknown> | undefined
  const signatureRequestId = signatureRequest?.signature_request_id as string | undefined

  if (eventType === 'signature_request_all_signed' && signatureRequestId) {
    void handleAllSigned(signatureRequestId, apiKey)
  }

  // Dropbox Sign requires this exact response body to acknowledge receipt
  return new Response('Hello API Event Received', { status: 200 })
}

async function handleAllSigned(signatureRequestId: string, apiKey: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // --- Find order_documents by esign_ref ---
    const { data: docs, error: docsError } = await supabase
      .from('order_documents')
      .select('id, order_id, document_type, storage_key')
      .eq('esign_ref', signatureRequestId)

    if (docsError || !docs || docs.length === 0) {
      console.error('[dropboxsign-webhook] No order_documents found for signature request', signatureRequestId, docsError)
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
      console.error('[dropboxsign-webhook] Order not found for id', orderId, orderError)
      return
    }

    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', order.buyer_id)
      .single()

    if (buyerError || !buyer) {
      console.error('[dropboxsign-webhook] Buyer profile not found for order', orderId, buyerError)
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

    // --- Download signed PDF from Dropbox Sign (combined PDF for all documents) ---
    const signedAt   = new Date().toISOString()
    const orderNumber = orderId.slice(0, 8).toUpperCase()
    const signedKey  = `${orderId}/signed-documents.pdf`

    let signedBuffer: Buffer | null = null
    try {
      const api      = getSignatureRequestApi()
      const response = await api.signatureRequestFiles(signatureRequestId, 'pdf')
      signedBuffer   = Buffer.from(response.body as unknown as ArrayBuffer)
    } catch (err) {
      console.error('[dropboxsign-webhook] Failed to download signed PDF', signatureRequestId, err)
    }

    if (signedBuffer) {
      const { error: uploadError } = await supabase.storage
        .from('order-documents')
        .upload(signedKey, signedBuffer, { contentType: 'application/pdf', upsert: true })

      if (uploadError) {
        console.error('[dropboxsign-webhook] Failed to upload signed PDF', signedKey, uploadError)
      }

      // Update all order_documents rows for this order
      await supabase
        .from('order_documents')
        .update({
          status:     'signed',
          signed_at:  signedAt,
          signer_id:  order.buyer_id,
          storage_key: signedKey,
        })
        .eq('order_id', orderId)

      await supabase
        .from('orders')
        .update({ status: 'documents_signed' })
        .eq('id', orderId)

      // --- Send NOTF-04: documents complete email ---
      const buyerName = buyer.full_name ?? buyer.email ?? 'Valued Customer'

      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      buyer.email ?? '',
        subject: `Your signed documents are ready — ${vehicleTitle}`,
        html:    await render(
          React.createElement(DocumentsCompleteEmail, {
            buyerName,
            vehicleTitle,
            orderNumber,
          })
        ),
        attachments: [{ filename: 'signed-documents.pdf', content: signedBuffer }],
      })
    } else {
      console.error('[dropboxsign-webhook] No signed PDF downloaded for order', orderId, '— order status not advanced, NOTF-04 not sent')
    }
  } catch (err) {
    console.error('[dropboxsign-webhook] Unhandled error in handleAllSigned', signatureRequestId, err)
  }
}
