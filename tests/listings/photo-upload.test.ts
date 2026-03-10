import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the browser supabase client before importing storage
vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        getPublicUrl: (key: string) => ({
          data: { publicUrl: `https://abc.supabase.co/storage/v1/object/public/car-photos/${key}` },
        }),
      }),
    },
  }),
}))

import { buildStorageKey, getPhotoPublicUrl } from '@/lib/storage'

describe('photo upload storage key (LIST-03, GRADE-01)', () => {
  it('buildStorageKey returns path in format {listingId}/{uuid}.{ext}', () => {
    const key = buildStorageKey('listing-123', 'photo.jpg')
    expect(key).toMatch(/^listing-123\/[0-9a-f-]{36}\.jpg$/)
  })

  it('buildStorageKey uses the correct file extension from the filename', () => {
    const key = buildStorageKey('listing-123', 'photo.webp')
    expect(key).toMatch(/\.webp$/)
  })

  it('buildStorageKey generates unique keys on each call (no collision)', () => {
    const key1 = buildStorageKey('listing-123', 'photo.jpg')
    const key2 = buildStorageKey('listing-123', 'photo.jpg')
    expect(key1).not.toBe(key2)
  })

  it('getPhotoPublicUrl returns a URL containing the Supabase project host', () => {
    const url = getPhotoPublicUrl('listing-123/uuid.jpg')
    expect(url).toContain('supabase.co')
  })

  it('getPhotoPublicUrl returns a URL containing /storage/v1/object/public/car-photos/', () => {
    const url = getPhotoPublicUrl('listing-123/uuid.jpg')
    expect(url).toContain('/storage/v1/object/public/car-photos/')
  })
})
