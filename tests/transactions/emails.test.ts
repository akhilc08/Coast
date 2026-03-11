import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'

describe('email templates', () => {
  it('OrderConfirmationEmail renders without errors', async () => {
    const { OrderConfirmationEmail } = await import('@/lib/email/order-confirmation')
    const html = await render(
      OrderConfirmationEmail({
        orderNumber: 'ABCD1234',
        orderId: 'order-uuid-123',
        vehicleTitle: '2020 Toyota Camry',
        priceCents: 1500000,
        buyerName: 'Test Buyer',
      })
    )
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
    expect(html).toContain('Order Confirmed')
    expect(html).toContain('2020 Toyota Camry')
  })

  it('AdminOrderAlertEmail renders without errors', async () => {
    const { AdminOrderAlertEmail } = await import('@/lib/email/admin-order-alert')
    const html = await render(
      AdminOrderAlertEmail({
        orderNumber: 'ABCD1234',
        vehicleTitle: '2020 Toyota Camry',
        priceCents: 1500000,
        buyerName: 'Test Buyer',
        buyerEmail: 'buyer@example.com',
      })
    )
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
    expect(html).toContain('New Order Alert')
    expect(html).toContain('2020 Toyota Camry')
  })

  it('SigningRequestEmail renders without errors', async () => {
    const { SigningRequestEmail } = await import('@/lib/email/signing-request')
    const html = await render(
      SigningRequestEmail({
        buyerName: 'Test Buyer',
        vehicleTitle: '2020 Toyota Camry',
        orderNumber: 'ABCD1234',
        orderUrl: 'https://coastautos.com/account/orders/test-order-id',
      })
    )
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
    expect(html.toLowerCase()).toContain('ready to sign')
  })

  it('DocumentsCompleteEmail renders without errors', async () => {
    const { DocumentsCompleteEmail } = await import('@/lib/email/documents-complete')
    const html = await render(
      DocumentsCompleteEmail({
        buyerName: 'Test Buyer',
        vehicleTitle: '2020 Toyota Camry',
        orderNumber: 'ABCD1234',
      })
    )
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
    expect(html.toLowerCase()).toContain('documents are complete')
  })
})
