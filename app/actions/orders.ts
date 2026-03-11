'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Server Action: Generate a short-lived signed URL for a private order document.
 *
 * SECURITY: Verifies the requesting user is the buyer on the order before
 * issuing a signed URL. Uses the admin client to bypass RLS for storage access.
 *
 * @param documentId - UUID of the order_document record
 * @returns Signed URL valid for 1 hour
 */
export async function getOrderDocumentUrl(documentId: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Fetch document with order join to verify buyer ownership
  const { data: document, error } = await supabase
    .from('order_documents')
    .select('id, storage_key, orders!inner(buyer_id)')
    .eq('id', documentId)
    .single()

  if (error || !document) {
    throw new Error('Document not found')
  }

  // Verify the requesting user is the buyer on this order
  // Supabase types the join as an array but .single() on the parent gives us one row
  const orderJoin = document.orders as unknown as { buyer_id: string } | { buyer_id: string }[]
  const buyerId = Array.isArray(orderJoin) ? orderJoin[0]?.buyer_id : orderJoin.buyer_id
  if (buyerId !== user.id) {
    throw new Error('Unauthorized')
  }

  const storageKey = document.storage_key as string | null
  if (!storageKey) {
    throw new Error('Document not yet generated')
  }

  // Use admin client to generate signed URL from private bucket
  const admin = createAdminClient()
  const { data: signedData, error: signError } = await admin.storage
    .from('order-documents')
    .createSignedUrl(storageKey, 3600) // 1 hour expiry

  if (signError || !signedData?.signedUrl) {
    throw new Error('Failed to generate download link')
  }

  return signedData.signedUrl
}
