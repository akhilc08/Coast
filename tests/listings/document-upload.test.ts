import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({}),
}))

import { isValidDocumentMime, buildStorageKey } from '@/lib/storage'

describe('document upload MIME validation (LIST-04)', () => {
  it('isValidDocumentMime returns true for application/pdf', () => {
    expect(isValidDocumentMime('application/pdf')).toBe(true)
  })

  it('isValidDocumentMime returns false for image/jpeg', () => {
    expect(isValidDocumentMime('image/jpeg')).toBe(false)
  })

  it('isValidDocumentMime returns false for application/msword', () => {
    expect(isValidDocumentMime('application/msword')).toBe(false)
  })

  it('document upload path is scoped to {listingId}/{uuid}.pdf pattern', () => {
    const key = buildStorageKey('listing-456', 'carfax.pdf')
    expect(key).toMatch(/^listing-456\/[0-9a-f-]{36}\.pdf$/)
  })
})
