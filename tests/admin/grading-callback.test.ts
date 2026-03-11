import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// Build a chainable Supabase mock for the grading callback
// select chain: .from('listings').select('id').eq('vin', vin).single()
// update chain: .from('listings').update({...}).eq('id', listingId)

const mockSingle = vi.fn()
const mockSelectEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))

const mockUpdateEq = vi.fn(() => Promise.resolve({ error: null }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'listings') {
    return { select: mockSelect, update: mockUpdate }
  }
  return { select: mockSelect, update: mockUpdate }
})

const mockAdminClient = { from: mockFrom }

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

function makeRequest(headers: Record<string, string>, body: unknown) {
  return new Request('http://localhost/api/grading/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/grading/callback', () => {
  beforeAll(() => {
    process.env.GRADING_API_KEY = 'test-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return { select: mockSelect, update: mockUpdate }
      }
      return { select: mockSelect, update: mockUpdate }
    })
  })

  it('returns 401 when x-api-key header is missing', async () => {
    const { POST } = await import('@/app/api/grading/callback/route')
    const req = makeRequest({}, { vin: 'ABCDEFGH12345678X', grade: '8' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when x-api-key header is wrong', async () => {
    const { POST } = await import('@/app/api/grading/callback/route')
    const req = makeRequest({ 'x-api-key': 'wrong-key' }, { vin: 'ABCDEFGH12345678X', grade: '8' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('@/app/api/grading/callback/route')
    const req = new Request('http://localhost/api/grading/callback', {
      method: 'POST',
      headers: { 'x-api-key': 'test-key', 'content-type': 'application/json' },
      body: 'not-valid-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid payload (missing vin, bad grade)', async () => {
    const { POST } = await import('@/app/api/grading/callback/route')
    const req = makeRequest({ 'x-api-key': 'test-key' }, { grade: 'A' }) // missing vin
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when VIN not found in listings', async () => {
    const { POST } = await import('@/app/api/grading/callback/route')
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const req = makeRequest({ 'x-api-key': 'test-key' }, { vin: 'ABCDEFGH12345678X', grade: '8' })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 200 with listing_id and updates grade on valid request', async () => {
    const { POST } = await import('@/app/api/grading/callback/route')
    mockSingle.mockResolvedValue({ data: { id: 'listing-uuid-123' }, error: null })
    mockUpdateEq.mockResolvedValue({ error: null })

    const req = makeRequest({ 'x-api-key': 'test-key' }, { vin: 'ABCDEFGH12345678X', grade: '8', grade_source: 'ai' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.listing_id).toBe('listing-uuid-123')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ grade: '8', grade_source: 'ai' })
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'listing-uuid-123')
  })

  it('normalizes VIN to uppercase before lookup', async () => {
    const { POST } = await import('@/app/api/grading/callback/route')
    mockSingle.mockResolvedValue({ data: { id: 'listing-uuid-456' }, error: null })
    mockUpdateEq.mockResolvedValue({ error: null })

    const req = makeRequest({ 'x-api-key': 'test-key' }, { vin: 'abcdefgh12345678x', grade: '7' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // The eq call for VIN lookup should have received uppercase VIN
    expect(mockSelectEq).toHaveBeenCalledWith('vin', 'ABCDEFGH12345678X')
  })
})
