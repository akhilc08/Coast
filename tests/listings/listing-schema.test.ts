import { describe, it, expect } from 'vitest'
import { vinStepSchema, detailsStepSchema } from '@/lib/validations/listing'

describe('listing Zod schemas (LIST-01)', () => {
  it('vinStepSchema rejects VIN shorter than 17 characters', () => {
    const result = vinStepSchema.safeParse({ vin: '1HGCM82633A00435' })
    expect(result.success).toBe(false)
  })

  it('vinStepSchema rejects VIN with invalid characters (I, O, Q)', () => {
    const result = vinStepSchema.safeParse({ vin: '1HGCM82633I004352' })
    expect(result.success).toBe(false)
  })

  it('detailsStepSchema requires make, model, year, mileage, price_cents', () => {
    const result = detailsStepSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('detailsStepSchema rejects year outside 1900–2100 range', () => {
    const result = detailsStepSchema.safeParse({ make: 'Honda', model: 'Accord', year: 1800, mileage: 0, price_cents: 100 })
    expect(result.success).toBe(false)
  })

  it('detailsStepSchema rejects negative mileage', () => {
    const result = detailsStepSchema.safeParse({ make: 'Honda', model: 'Accord', year: 2003, mileage: -1, price_cents: 100 })
    expect(result.success).toBe(false)
  })

  it('detailsStepSchema rejects price_cents <= 0', () => {
    const result = detailsStepSchema.safeParse({ make: 'Honda', model: 'Accord', year: 2003, mileage: 0, price_cents: 0 })
    expect(result.success).toBe(false)
  })
})
