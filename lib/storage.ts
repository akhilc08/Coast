'use client'

import { createClient } from '@/lib/supabase/browser'

export function buildStorageKey(listingId: string, filename: string): string {
  const ext = filename.split('.').pop() ?? 'jpg'
  return `${listingId}/${crypto.randomUUID()}.${ext}`
}

export function getPhotoPublicUrl(storageKey: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from('car-photos').getPublicUrl(storageKey)
  return data.publicUrl
}

export function isValidDocumentMime(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}
