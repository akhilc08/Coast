import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/server — after() is a Next.js request-context API that fails in unit tests
vi.mock('next/server', () => ({
  after: vi.fn((fn: () => Promise<void>) => {
    // In tests, invoke immediately so we can still exercise the code path
    void fn()
  }),
}))

// Mock fulfillment to prevent actual PDF/Dropbox Sign work in webhook tests
vi.mock('@/lib/fulfillment', () => ({
  generateAndSendDocuments: vi.fn(() => Promise.resolve()),
}))

// Mock Stripe
const mockConstructEvent = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  },
}))

// Build a chainable Supabase mock
// For the select chain used in idempotency check: .from().select().eq().single()
// For insert chain: .from().insert()
// For update chain: .from().update().eq().eq()

// Plain async insert (no chaining needed after simplification)
const mockInsert = vi.fn(() => Promise.resolve({ data: null, error: null }))
const mockUpdateEq2 = vi.fn(() => Promise.resolve({ error: null }))
const mockUpdateEq1 = vi.fn(() => ({ eq: mockUpdateEq2 }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq1 }))

const mockIdempotencySingle = vi.fn()
const mockIdempotencyEq = vi.fn(() => ({ single: mockIdempotencySingle }))
const mockIdempotencySelect = vi.fn(() => ({ eq: mockIdempotencyEq }))

// listings select for email title fetch
const mockListingsSingle = vi.fn(() =>
  Promise.resolve({ data: { title: '2020 Toyota Camry' }, error: null })
)
const mockListingsSelectEq = vi.fn(() => ({ single: mockListingsSingle }))
const mockListingsSelect = vi.fn(() => ({ eq: mockListingsSelectEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'orders') {
    return { select: mockIdempotencySelect, insert: mockInsert }
  }
  if (table === 'listings') {
    return { update: mockUpdate, select: mockListingsSelect }
  }
  if (table === 'order_documents') {
    return { insert: mockInsert }
  }
  return { select: mockIdempotencySelect, insert: mockInsert, update: mockUpdate }
})

const mockAdminClient = { from: mockFrom }
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

// Mock Resend
const mockEmailsSend = vi.fn(() => Promise.resolve({ data: { id: 'email-id' }, error: null }))
vi.mock('@/lib/resend', () => ({
  resend: { emails: { send: mockEmailsSend } },
  ADMIN_EMAIL: 'admin@coastautos.com',
  FROM_EMAIL: 'Coast <no-reply@coastautos.com>',
}))

// Helper to create a fake Request with stripe-signature header
function makeRequest(body: string, sig: string) {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': sig, 'content-type': 'text/plain' },
    body,
  })
}

describe('Stripe webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    // Reset from mock implementation after clearAllMocks
    mockFrom.mockImplementation((table: string) => {
      if (table === 'orders') {
        return { select: mockIdempotencySelect, insert: mockInsert }
      }
      if (table === 'listings') {
        return { update: mockUpdate, select: mockListingsSelect }
      }
      if (table === 'order_documents') {
        return { insert: mockInsert }
      }
      return { select: mockIdempotencySelect, insert: mockInsert, update: mockUpdate }
    })
  })

  it('creates order and marks listing sold on checkout.session.completed', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route')

    const fakeSession = {
      id: 'cs_test_abc',
      amount_total: 1500000,
      payment_intent: 'pi_test_123',
      metadata: {
        listing_id: 'listing-abc',
        buyer_id: 'buyer-123',
        seller_id: 'seller-456',
      },
      customer_details: { email: 'buyer@example.com', name: 'Test Buyer' },
    }

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: fakeSession },
    })

    // Idempotency check: no existing order
    mockIdempotencySingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const req = makeRequest('{}', 'valid-sig')
    const response = await POST(req)

    expect(response.status).toBe(200)

    // Listing was marked sold
    expect(mockFrom).toHaveBeenCalledWith('listings')
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'sold' })

    // Order was inserted
    expect(mockFrom).toHaveBeenCalledWith('orders')

    // order_documents were inserted
    expect(mockFrom).toHaveBeenCalledWith('order_documents')

    // Two emails were sent
    expect(mockEmailsSend).toHaveBeenCalledTimes(2)
  })

  it('is idempotent — skips if order already exists for session', async () => {
    vi.resetModules()
    vi.mock('@/lib/stripe', () => ({
      stripe: { webhooks: { constructEvent: mockConstructEvent } },
    }))
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }))
    vi.mock('@/lib/resend', () => ({
      resend: { emails: { send: mockEmailsSend } },
      ADMIN_EMAIL: 'admin@coastautos.com',
      FROM_EMAIL: 'Coast <no-reply@coastautos.com>',
    }))

    const { POST } = await import('@/app/api/webhooks/stripe/route')

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_duplicate',
          amount_total: 1500000,
          payment_intent: 'pi_test_dup',
          metadata: {
            listing_id: 'listing-abc',
            buyer_id: 'buyer-123',
            seller_id: 'seller-456',
          },
          customer_details: { email: 'buyer@example.com', name: 'Test Buyer' },
        },
      },
    })

    // Idempotency check: order already exists
    mockIdempotencySingle.mockResolvedValue({ data: { id: 'existing-order-id' }, error: null })

    const req = makeRequest('{}', 'valid-sig')
    const response = await POST(req)

    expect(response.status).toBe(200)
    // Should NOT insert a new order
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockEmailsSend).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid signature', async () => {
    vi.resetModules()
    vi.mock('@/lib/stripe', () => ({
      stripe: { webhooks: { constructEvent: mockConstructEvent } },
    }))
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }))
    vi.mock('@/lib/resend', () => ({
      resend: { emails: { send: mockEmailsSend } },
      ADMIN_EMAIL: 'admin@coastautos.com',
      FROM_EMAIL: 'Coast <no-reply@coastautos.com>',
    }))

    const { POST } = await import('@/app/api/webhooks/stripe/route')

    mockConstructEvent.mockImplementation(() => {
      throw new Error('Webhook signature verification failed')
    })

    const req = makeRequest('{}', 'bad-sig')
    const response = await POST(req)

    expect(response.status).toBe(400)
  })

  it('returns 200 for unhandled event types', async () => {
    vi.resetModules()
    vi.mock('@/lib/stripe', () => ({
      stripe: { webhooks: { constructEvent: mockConstructEvent } },
    }))
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }))
    vi.mock('@/lib/resend', () => ({
      resend: { emails: { send: mockEmailsSend } },
      ADMIN_EMAIL: 'admin@coastautos.com',
      FROM_EMAIL: 'Coast <no-reply@coastautos.com>',
    }))

    const { POST } = await import('@/app/api/webhooks/stripe/route')

    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.created',
      data: { object: {} },
    })

    const req = makeRequest('{}', 'valid-sig')
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
