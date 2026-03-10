import { describe, it } from 'vitest'

// Target: lib/storage.ts (created in 02-02)
// import { buildStorageKey, getPhotoPublicUrl } from '@/lib/storage'

describe('photo upload storage key (LIST-03, GRADE-01)', () => {
  it.todo('buildStorageKey returns path in format {listingId}/{uuid}.{ext}')
  it.todo('buildStorageKey uses the correct file extension from the filename')
  it.todo('buildStorageKey generates unique keys on each call (no collision)')
  it.todo('getPhotoPublicUrl returns a URL containing the Supabase project host')
  it.todo('getPhotoPublicUrl returns a URL containing /storage/v1/object/public/car-photos/')
})
