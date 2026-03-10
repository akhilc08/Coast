import { describe, it } from 'vitest'

// Target: lib/validations/listing.ts (created in 02-02)
// import { vinStepSchema, detailsStepSchema } from '@/lib/validations/listing'

describe('listing Zod schemas (LIST-01)', () => {
  it.todo('vinStepSchema rejects VIN shorter than 17 characters')
  it.todo('vinStepSchema rejects VIN with invalid characters (I, O, Q)')
  it.todo('detailsStepSchema requires make, model, year, mileage, price_cents')
  it.todo('detailsStepSchema rejects year outside 1900–2100 range')
  it.todo('detailsStepSchema rejects negative mileage')
  it.todo('detailsStepSchema rejects price_cents <= 0')
})
