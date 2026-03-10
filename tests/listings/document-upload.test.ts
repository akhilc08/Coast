import { describe, it } from 'vitest'

// Target: lib/storage.ts or StepDocuments.tsx validation
// import { isValidDocumentMime } from '@/lib/storage'

describe('document upload MIME validation (LIST-04)', () => {
  it.todo('isValidDocumentMime returns true for application/pdf')
  it.todo('isValidDocumentMime returns false for image/jpeg')
  it.todo('isValidDocumentMime returns false for application/msword')
  it.todo('document upload path is scoped to {listingId}/{uuid}.pdf pattern')
})
