import { describe, it, expect } from 'vitest'

describe('generatePurchaseAgreement', () => {
  it('returns a non-empty Buffer', async () => {
    const { generatePurchaseAgreement } = await import('@/lib/pdf/purchase-agreement')
    const buf = await generatePurchaseAgreement({
      vin: '1HGBH41JXMN109186',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      mileage: 30000,
      color: 'Silver',
      priceCents: 1500000,
      buyerName: 'Alice Buyer',
      buyerEmail: 'alice@example.com',
      sellerName: 'Bob Seller',
      date: '2026-03-10',
      orderNumber: 'ABCD1234',
    })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(500)
  })

  it('generated PDF starts with %PDF header', async () => {
    const { generatePurchaseAgreement } = await import('@/lib/pdf/purchase-agreement')
    const buf = await generatePurchaseAgreement({
      vin: '1HGBH41JXMN109186',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      mileage: 30000,
      color: 'Silver',
      priceCents: 1500000,
      buyerName: 'Alice Buyer',
      buyerEmail: 'alice@example.com',
      sellerName: 'Bob Seller',
      date: '2026-03-10',
      orderNumber: 'ABCD1234',
    })
    expect(buf.toString('utf8', 0, 5)).toBe('%PDF-')
  })
})

describe('generateBillOfSale', () => {
  it('returns a non-empty Buffer', async () => {
    const { generateBillOfSale } = await import('@/lib/pdf/bill-of-sale')
    const buf = await generateBillOfSale({
      vin: '1HGBH41JXMN109186',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      mileage: 30000,
      color: 'Silver',
      priceCents: 1500000,
      buyerName: 'Alice Buyer',
      buyerEmail: 'alice@example.com',
      sellerName: 'Bob Seller',
      date: '2026-03-10',
      orderNumber: 'ABCD1234',
    })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(500)
  })

  it('generated PDF starts with %PDF header', async () => {
    const { generateBillOfSale } = await import('@/lib/pdf/bill-of-sale')
    const buf = await generateBillOfSale({
      vin: '1HGBH41JXMN109186',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      mileage: 30000,
      color: 'Silver',
      priceCents: 1500000,
      buyerName: 'Alice Buyer',
      buyerEmail: 'alice@example.com',
      sellerName: 'Bob Seller',
      date: '2026-03-10',
      orderNumber: 'ABCD1234',
    })
    expect(buf.toString('utf8', 0, 5)).toBe('%PDF-')
  })
})
