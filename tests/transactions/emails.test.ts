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

  it.todo('SigningRequestEmail renders without errors')
  it.todo('DocumentsCompleteEmail renders without errors')
})
