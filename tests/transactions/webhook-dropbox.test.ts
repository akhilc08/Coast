import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

// Mock env var early
process.env.DROPBOX_SIGN_API_KEY = 'test-dropbox-api-key'

// Mock Dropbox Sign signatureApi
const mockSignatureRequestFiles = vi.fn()
vi.mock('@/lib/dropbox-sign', () => ({
  signatureApi: {
    signatureRequestFiles: mockSignatureRequestFiles,
  },
}))

// Mock Supabase admin
const mockStorageUpload = vi.fn(() => Promise.resolve({ error: null }))
const mockStorageFrom = vi.fn(() => ({ upload: mockStorageUpload }))

const mockOrderDocsSingle = vi.fn()
const mockOrderDocsUpdateEq = vi.fn(() => Promise.resolve({ error: null }))
const mockOrderDocsUpdate = vi.fn(() => ({ eq: mockOrderDocsUpdateEq }))

// select chain: .from('order_documents').select('...').eq('esign_ref', id)
const mockOrderDocsSelectEq = vi.fn()
const mockOrderDocsSelect = vi.fn(() => ({ eq: mockOrderDocsSelectEq }))

// orders select chain: .from('orders').select('id, ...').eq('id', orderId).single()
const mockOrdersSingle = vi.fn()
const mockOrdersSelectEq = vi.fn(() => ({ single: mockOrdersSingle }))
const mockOrdersSelect = vi.fn(() => ({ eq: mockOrdersSelectEq }))
const mockOrdersUpdate = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))

// profiles select chain: .from('profiles').select('...').eq('id', ...).single()
const mockProfilesSingle = vi.fn()
const mockProfilesSelectEq = vi.fn(() => ({ single: mockProfilesSingle }))
const mockProfilesSelect = vi.fn(() => ({ eq: mockProfilesSelectEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'order_documents') {
    return { select: mockOrderDocsSelect, update: mockOrderDocsUpdate }
  }
  if (table === 'orders') {
    return { select: mockOrdersSelect, update: mockOrdersUpdate }
  }
  if (table === 'profiles') {
    return { select: mockProfilesSelect }
  }
  return {}
})

const mockAdminClient = {
  from: mockFrom,
  storage: { from: mockStorageFrom },
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

// Mock Resend
const mockEmailsSend = vi.fn(() => Promise.resolve({ data: { id: 'email-id' }, error: null }))
vi.mock('@/lib/resend', () => ({
  resend: { emails: { send: mockEmailsSend } },
  FROM_EMAIL: 'Coast <no-reply@coastautos.com>',
  ADMIN_EMAIL: 'admin@coastautos.com',
}))

/**
 * Build a valid Dropbox Sign HMAC event hash.
 */
function buildEventHash(eventTime: string, eventType: string): string {
  return createHmac('sha256', 'test-dropbox-api-key')
    .update(`${eventTime}${eventType}`)
    .digest('hex')
}

/**
 * Build a multipart/form-data request mimicking Dropbox Sign callback format.
 */
async function makeDropboxRequest(
  eventType: string,
  eventHash: string,
  extraPayload?: Record<string, unknown>
) {
  const eventTime = '1700000000'
  const json = JSON.stringify({
    event: {
      event_time: eventTime,
      event_type: eventType,
      event_hash: eventHash,
    },
    signature_request: {
      signature_request_id: 'sig_req_test_abc',
      ...extraPayload,
    },
  })

  const formData = new FormData()
  formData.append('json', json)

  return new Request('http://localhost/api/webhooks/dropbox-sign', {
    method: 'POST',
    body: formData,
  })
}

describe('Dropbox Sign callback handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Restore chainable mock implementations after clearAllMocks() wipes them
    mockOrderDocsUpdate.mockImplementation(() => ({ eq: mockOrderDocsUpdateEq }))
    mockOrderDocsUpdateEq.mockResolvedValue({ error: null })
    mockOrderDocsSelect.mockImplementation(() => ({ eq: mockOrderDocsSelectEq }))
    mockOrdersSelect.mockImplementation(() => ({ eq: mockOrdersSelectEq }))
    mockOrdersSelectEq.mockImplementation(() => ({ single: mockOrdersSingle }))
    mockOrdersUpdate.mockImplementation(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    mockProfilesSelect.mockImplementation(() => ({ eq: mockProfilesSelectEq }))
    mockProfilesSelectEq.mockImplementation(() => ({ single: mockProfilesSingle }))
    mockStorageFrom.mockImplementation(() => ({ upload: mockStorageUpload }))
    mockStorageUpload.mockResolvedValue({ error: null })

    // Default: no order_documents found
    mockOrderDocsSelectEq.mockResolvedValue({ data: [], error: null })
    mockOrdersSingle.mockResolvedValue({
      data: { id: 'order-abc', buyer_id: 'buyer-123' },
      error: null,
    })
    mockProfilesSingle.mockResolvedValue({
      data: { email: 'buyer@example.com', full_name: 'Test Buyer' },
      error: null,
    })

    // Signed file download mock — returns a Buffer
    mockSignatureRequestFiles.mockResolvedValue({
      body: Buffer.from('%PDF-signed-mock-content'),
    })
  })

  it('returns Hello API Event Received on valid signature_request_all_signed', async () => {
    vi.resetModules()
    vi.mock('@/lib/dropbox-sign', () => ({
      signatureApi: { signatureRequestFiles: mockSignatureRequestFiles },
    }))
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }))
    vi.mock('@/lib/resend', () => ({
      resend: { emails: { send: mockEmailsSend } },
      FROM_EMAIL: 'Coast <no-reply@coastautos.com>',
      ADMIN_EMAIL: 'admin@coastautos.com',
    }))

    const { POST } = await import('@/app/api/webhooks/dropbox-sign/route')

    const eventTime = '1700000000'
    const eventType = 'signature_request_all_signed'
    const hash = buildEventHash(eventTime, eventType)

    const json = JSON.stringify({
      event: { event_time: eventTime, event_type: eventType, event_hash: hash },
      signature_request: { signature_request_id: 'sig_req_test_abc' },
    })
    const formData = new FormData()
    formData.append('json', json)
    const req = new Request('http://localhost/api/webhooks/dropbox-sign', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)

    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe('Hello API Event Received')
  })

  it('returns 401 on invalid event hash', async () => {
    vi.resetModules()
    vi.mock('@/lib/dropbox-sign', () => ({
      signatureApi: { signatureRequestFiles: mockSignatureRequestFiles },
    }))
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }))
    vi.mock('@/lib/resend', () => ({
      resend: { emails: { send: mockEmailsSend } },
      FROM_EMAIL: 'Coast <no-reply@coastautos.com>',
      ADMIN_EMAIL: 'admin@coastautos.com',
    }))

    const { POST } = await import('@/app/api/webhooks/dropbox-sign/route')

    const eventTime = '1700000000'
    const eventType = 'signature_request_all_signed'

    const json = JSON.stringify({
      event: {
        event_time: eventTime,
        event_type: eventType,
        event_hash: 'invalid-hash-value',
      },
      signature_request: { signature_request_id: 'sig_req_test_abc' },
    })
    const formData = new FormData()
    formData.append('json', json)
    const req = new Request('http://localhost/api/webhooks/dropbox-sign', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('updates order_documents status to signed on valid event', async () => {
    vi.resetModules()
    vi.mock('@/lib/dropbox-sign', () => ({
      signatureApi: { signatureRequestFiles: mockSignatureRequestFiles },
    }))
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }))
    vi.mock('@/lib/resend', () => ({
      resend: { emails: { send: mockEmailsSend } },
      FROM_EMAIL: 'Coast <no-reply@coastautos.com>',
      ADMIN_EMAIL: 'admin@coastautos.com',
    }))

    const { POST } = await import('@/app/api/webhooks/dropbox-sign/route')

    // Set up: order_documents rows exist for this signature request
    mockOrderDocsSelectEq.mockResolvedValue({
      data: [
        {
          id: 'doc-1',
          order_id: 'order-abc',
          document_type: 'purchase_agreement',
          storage_key: 'order-abc/purchase-agreement.pdf',
        },
        {
          id: 'doc-2',
          order_id: 'order-abc',
          document_type: 'bill_of_sale',
          storage_key: 'order-abc/bill-of-sale.pdf',
        },
      ],
      error: null,
    })

    mockOrdersSingle.mockResolvedValue({
      data: { id: 'order-abc', buyer_id: 'buyer-123' },
      error: null,
    })

    mockProfilesSingle.mockResolvedValue({
      data: { email: 'buyer@example.com', full_name: 'Test Buyer' },
      error: null,
    })

    mockSignatureRequestFiles.mockResolvedValue({
      body: Buffer.from('%PDF-signed-mock-content'),
    })

    const eventTime = '1700000000'
    const eventType = 'signature_request_all_signed'
    const hash = buildEventHash(eventTime, eventType)

    const json = JSON.stringify({
      event: { event_time: eventTime, event_type: eventType, event_hash: hash },
      signature_request: { signature_request_id: 'sig_req_test_abc' },
    })
    const formData = new FormData()
    formData.append('json', json)
    const req = new Request('http://localhost/api/webhooks/dropbox-sign', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    // handleAllSigned is fire-and-forget (void) — wait for microtask queue to drain
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Should have queried order_documents by esign_ref
    expect(mockFrom).toHaveBeenCalledWith('order_documents')

    // Should have attempted to update order_documents
    expect(mockOrderDocsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'signed' })
    )
  })
})
