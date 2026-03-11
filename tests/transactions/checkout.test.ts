import { describe, it, expect, vi, beforeEach } from 'vitest'

// Next.js redirect() throws a special NEXT_REDIRECT error to halt execution.
// We replicate that behavior in our mock so the function stops on redirect.
class NextRedirectError extends Error {
  digest: string
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`)
    this.digest = `NEXT_REDIRECT;replace;${url};307;`
  }
}

const mockRedirect = vi.fn((url: string) => {
  throw new NextRedirectError(url)
})

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

// Mock Supabase server client
const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockEq2 = vi.fn(() => ({ single: mockSingle }))
const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
const mockSelect = vi.fn(() => ({ eq: mockEq1 }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Mock Stripe client
const mockSessionsCreate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mockSessionsCreate,
      },
    },
  },
}))

describe('createCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-apply the throwing redirect behavior after clearAllMocks
    mockRedirect.mockImplementation((url: string) => {
      throw new NextRedirectError(url)
    })
  })

  it('creates Stripe checkout session for active listing and redirects', async () => {
    const { createCheckoutSession } = await import('@/app/actions/checkout')

    const listingId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSingle.mockResolvedValue({
      data: {
        id: listingId,
        title: '2020 Toyota Camry',
        price_cents: 1500000,
        status: 'active',
        seller_id: 'seller-456',
      },
      error: null,
    })
    mockSessionsCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    })

    // redirect() throws a NextRedirectError — we catch and verify it
    await expect(createCheckoutSession(listingId)).rejects.toThrow(
      'NEXT_REDIRECT: https://checkout.stripe.com/pay/cs_test_123'
    )

    expect(mockSessionsCreate).toHaveBeenCalledOnce()
    const callArgs = mockSessionsCreate.mock.calls[0][0]
    expect(callArgs.mode).toBe('payment')
    expect(callArgs.metadata.listing_id).toBe(listingId)
    expect(callArgs.metadata.buyer_id).toBe('user-123')
    expect(callArgs.metadata.seller_id).toBe('seller-456')
    expect(callArgs.line_items[0].price_data.unit_amount).toBe(1500000)
    expect(mockRedirect).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123')
  })

  it('throws error if listing is not active', async () => {
    const { createCheckoutSession } = await import('@/app/actions/checkout')

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const inactiveId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
    await expect(createCheckoutSession(inactiveId)).rejects.toThrow('Listing not available')
  })

  it('throws error if user is not authenticated', async () => {
    const { createCheckoutSession } = await import('@/app/actions/checkout')

    mockGetUser.mockResolvedValue({ data: { user: null } })

    const anyId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    await expect(createCheckoutSession(anyId)).rejects.toThrow('NEXT_REDIRECT: /login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
    expect(mockSessionsCreate).not.toHaveBeenCalled()
  })
})
