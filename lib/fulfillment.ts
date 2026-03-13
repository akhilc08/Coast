// lib/fulfillment.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { getSignatureRequestApi } from '@/lib/dropboxsign'
import { SignatureRequestSendRequest, SubSignatureRequestSigner, RequestDetailedFile } from '@dropbox/sign'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { generatePurchaseAgreement } from '@/lib/pdf/purchase-agreement'
import { generateBillOfSale } from '@/lib/pdf/bill-of-sale'
import { SigningRequestEmail } from '@/lib/email/signing-request'
import { dispatchTransportOrder } from '@/lib/transport/dispatch'
import { render } from '@react-email/components'
import * as React from 'react'

/**
 * Post-payment pipeline orchestrator.
 *
 * Called asynchronously (fire-and-forget) from the Stripe webhook via after().
 * Runs document generation and transport dispatch in parallel via Promise.allSettled
 * so a dispatch failure never blocks documents (and vice versa).
 */
export async function generateAndSendDocuments(orderId: string): Promise<void> {
  const [docsResult, dispatchResult] = await Promise.allSettled([
    _generateDocuments(orderId),
    dispatchTransportOrder(orderId),
  ])

  if (docsResult.status === 'rejected') {
    console.error('[fulfillment] Document pipeline failed for order', orderId, docsResult.reason)
  }
  if (dispatchResult.status === 'rejected') {
    console.error('[fulfillment] Transport dispatch failed for order', orderId, dispatchResult.reason)
  }
}

/**
 * Internal: generate PDFs, upload to storage, send to Dropbox Sign, notify buyer.
 * Steps:
 *  1. Fetch order with listing and buyer/seller profiles
 *  2. Generate purchase agreement and bill of sale PDFs
 *  3. Upload both to `order-documents` bucket
 *  4. Update order_documents rows with storage_key
 *  5. Send to Dropbox Sign (single request, buyer as signer, two documents)
 *  6. Store esign_ref (signature request ID) on both order_documents rows
 *  7. Update order_documents status to 'sent'
 *  8. Update orders.status to 'documents_sent'
 *  9. Send NOTF-03 (signing request notification) via Resend
 */
async function _generateDocuments(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // --- Step 1: Fetch order data ---
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, listing_id, buyer_id, seller_id, price_cents, vehicle_price_cents')
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
    const buyerName  = buyer.full_name ?? buyer.email ?? 'Buyer'
    const sellerName = seller.business_name ?? seller.full_name ?? 'Seller'
    const vehicleTitle =
      listing.title ??
      [listing.year, listing.make, listing.model].filter(Boolean).join(' ') ??
      'Vehicle'

    const docData = {
      vin:        listing.vin      ?? '',
      year:       listing.year     ?? 0,
      make:       listing.make     ?? '',
      model:      listing.model    ?? '',
      mileage:    listing.mileage  ?? 0,
      color:      listing.exterior_color ?? '',
      // Use vehicle_price_cents (vehicle only) for legal documents — not Stripe amount_total
      priceCents: order.vehicle_price_cents ?? order.price_cents ?? 0,
      buyerName,
      buyerEmail: buyer.email ?? '',
      sellerName,
      date:        today,
      orderNumber,
    }

    // --- Step 2: Generate PDFs ---
    const [purchaseAgreementBuffer, billOfSaleBuffer] = await Promise.all([
      generatePurchaseAgreement(docData),
      generateBillOfSale(docData),
    ])

    // --- Step 3: Upload PDFs to order-documents bucket ---
    const paKey  = `${orderId}/purchase-agreement.pdf`
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

    if (paUpload.error)  console.error('[fulfillment] Failed to upload purchase agreement', orderId, paUpload.error)
    if (bosUpload.error) console.error('[fulfillment] Failed to upload bill of sale', orderId, bosUpload.error)

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

    // --- Step 5: Send to Dropbox Sign ---
    const signer: SubSignatureRequestSigner = {
      emailAddress: buyer.email ?? '',
      name:         buyerName,
      order:        0,
    }

    const sendRequest = new SignatureRequestSendRequest()
    sendRequest.title       = `Vehicle Purchase — ${vehicleTitle}`
    sendRequest.subject     = `Please sign your vehicle purchase documents — ${vehicleTitle}`
    sendRequest.message     = 'Your vehicle purchase documents are ready for your signature.'
    sendRequest.signers     = [signer]
    const paFile: RequestDetailedFile  = { value: purchaseAgreementBuffer, options: { filename: 'purchase-agreement.pdf', contentType: 'application/pdf' } }
    const bosFile: RequestDetailedFile = { value: billOfSaleBuffer,        options: { filename: 'bill-of-sale.pdf',         contentType: 'application/pdf' } }
    sendRequest.files = [paFile, bosFile]
    sendRequest.useTextTags = true
    sendRequest.hideTextTags = true

    let signatureRequestId: string | undefined
    try {
      const api    = getSignatureRequestApi()
      const result = await api.signatureRequestSend(sendRequest)
      signatureRequestId = result.body.signatureRequest?.signatureRequestId ?? undefined
    } catch (err) {
      console.error('[fulfillment] Dropbox Sign API error for order', orderId, err)
    }

    // --- Steps 6 & 7: Update order_documents with esign_ref and status 'sent' ---
    const docUpdate: Record<string, unknown> = { status: 'sent' }
    if (signatureRequestId) docUpdate.esign_ref = signatureRequestId

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
    const baseUrl  = process.env.NEXT_PUBLIC_URL ?? 'https://coastautos.com'
    const orderUrl = `${baseUrl}/account/orders/${orderId}`

    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      buyer.email ?? '',
      subject: `Your documents are ready to sign — ${vehicleTitle}`,
      html:    await render(
        React.createElement(SigningRequestEmail, { buyerName, vehicleTitle, orderNumber, orderUrl })
      ),
    })
  } catch (err) {
    console.error('[fulfillment] Unhandled error in _generateDocuments for order', orderId, err)
  }
}
