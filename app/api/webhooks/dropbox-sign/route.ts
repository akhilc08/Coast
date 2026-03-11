import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { signatureApi } from '@/lib/dropbox-sign'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { DocumentsCompleteEmail } from '@/lib/email/documents-complete'
import { render } from '@react-email/components'
import * as React from 'react'

/**
 * Dropbox Sign callback handler.
 *
 * Dropbox Sign sends callbacks as multipart/form-data with the event JSON
 * in a field named 'json'. Must respond with exact text 'Hello API Event Received'
 * with status 200 or Dropbox Sign will retry.
 *
 * Handles: signature_request_all_signed
 *   1. Verify HMAC event hash
 *   2. Find order_documents by esign_ref
 *   3. Download signed PDFs from Dropbox Sign
 *   4. Upload signed PDFs to order-documents bucket with -signed suffix
 *   5. Update order_documents: status = 'signed', signed_at, storage_key
 *   6. Update orders.status to 'documents_signed'
 *   7. Send NOTF-04 (documents complete) with signed PDFs as email attachments
 */
export async function POST(request: Request) {
  // Parse multipart/form-data — Dropbox Sign sends payload as a 'json' field
  let payload: {
    event: {
      event_time: string
      event_type: string
      event_hash: string
    }
    signature_request?: {
      signature_request_id?: string
    }
  }

  try {
    const formData = await request.formData()
    const jsonStr = formData.get('json')
    if (!jsonStr || typeof jsonStr !== 'string') {
      return new Response('Bad Request', { status: 400 })
    }
    payload = JSON.parse(jsonStr)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const { event } = payload
  if (!event?.event_time || !event?.event_type || !event?.event_hash) {
    return new Response('Bad Request', { status: 400 })
  }

  // --- Verify HMAC event hash ---
  const apiKey = process.env.DROPBOX_SIGN_API_KEY ?? ''
  const expectedHash = createHmac('sha256', apiKey)
    .update(`${event.event_time}${event.event_type}`)
    .digest('hex')

  if (event.event_hash !== expectedHash) {
    return new Response('Invalid hash', { status: 401 })
  }

  // Handle signature_request_all_signed event
  if (event.event_type === 'signature_request_all_signed') {
    const signatureRequestId = payload.signature_request?.signature_request_id

    if (signatureRequestId) {
      // Fire-and-forget: handle completion async to respond quickly
      void handleAllSigned(signatureRequestId)
    }
  }

  // CRITICAL: Dropbox Sign requires this exact response text
  return new Response('Hello API Event Received', { status: 200 })
}

async function handleAllSigned(signatureRequestId: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // --- Find order_documents by esign_ref ---
    const { data: docs, error: docsError } = await supabase
      .from('order_documents')
      .select('id, order_id, document_type, storage_key')
      .eq('esign_ref', signatureRequestId)

    if (docsError || !docs || docs.length === 0) {
      console.error('[dropbox-sign] No order_documents found for signature_request_id', signatureRequestId, docsError)
      return
    }

    const orderId = docs[0].order_id

    // --- Fetch order to get buyer_id ---
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[dropbox-sign] Order not found for id', orderId, orderError)
      return
    }

    // --- Fetch buyer profile ---
    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', order.buyer_id)
      .single()

    if (buyerError || !buyer) {
      console.error('[dropbox-sign] Buyer profile not found for order', orderId, buyerError)
      return
    }

    // --- Fetch listing for vehicle title ---
    const { data: orderWithListing } = await supabase
      .from('orders')
      .select('listing_id')
      .eq('id', orderId)
      .single()

    let vehicleTitle = 'Vehicle'
    if (orderWithListing?.listing_id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('title, year, make, model')
        .eq('id', orderWithListing.listing_id)
        .single()

      if (listing) {
        vehicleTitle =
          listing.title ??
          [listing.year, listing.make, listing.model].filter(Boolean).join(' ') ??
          'Vehicle'
      }
    }

    // --- Download signed PDFs from Dropbox Sign ---
    let signedBuffer: Buffer | null = null
    try {
      const filesResponse = await signatureApi.signatureRequestFiles(signatureRequestId, 'pdf')
      if (filesResponse?.body) {
        if (Buffer.isBuffer(filesResponse.body)) {
          signedBuffer = filesResponse.body
        } else if (typeof filesResponse.body === 'object' && filesResponse.body !== null) {
          // Handle Uint8Array or other binary response types
          signedBuffer = Buffer.from(filesResponse.body as ArrayBuffer)
        }
      }
    } catch (err) {
      console.error('[dropbox-sign] Failed to download signed files', signatureRequestId, err)
    }

    const signedAt = new Date().toISOString()
    const orderNumber = orderId.slice(0, 8).toUpperCase()

    // --- For each document: upload signed PDF and update record ---
    const attachments: Array<{ filename: string; content: Buffer }> = []

    for (const doc of docs) {
      // Upload signed PDF to storage with -signed suffix
      const signedKey = doc.storage_key
        ? doc.storage_key.replace(/\.pdf$/, '-signed.pdf')
        : `${orderId}/${doc.document_type}-signed.pdf`

      if (signedBuffer) {
        const { error: uploadError } = await supabase.storage
          .from('order-documents')
          .upload(signedKey, signedBuffer, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (uploadError) {
          console.error('[dropbox-sign] Failed to upload signed PDF', signedKey, uploadError)
        }
      }

      // Update order_documents record
      await supabase
        .from('order_documents')
        .update({
          status: 'signed',
          signed_at: signedAt,
          signer_id: order.buyer_id,
          storage_key: signedBuffer ? signedKey : doc.storage_key,
        })
        .eq('id', doc.id)

      // Prepare attachment for NOTF-04
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

    // --- Send NOTF-04: documents complete email with signed PDF attachments ---
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
    console.error('[dropbox-sign] Unhandled error in handleAllSigned', signatureRequestId, err)
  }
}
