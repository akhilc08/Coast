import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — must use vi.fn() inside the factory, not top-level variables
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getListings, PAGE_SIZE } from '@/lib/queries/listings'

// Build a chainable mock query object
function buildMockQuery(overrides: Record<string, unknown> = {}) {
  const query: Record<string, unknown> = {}
  const chain = () => query

  query.textSearch = vi.fn(chain)
  query.in         = vi.fn(chain)
  query.gte        = vi.fn(chain)
  query.lte        = vi.fn(chain)
  query.not        = vi.fn(chain)
  query.order      = vi.fn(chain)
  query.range      = vi.fn().mockResolvedValue({ data: [], count: 0, error: null })
  query.eq         = vi.fn(chain)

  Object.assign(query, overrides)
  return query
}

describe('getListings query builder (STOR-01 to STOR-04)', () => {
  let mockQuery: ReturnType<typeof buildMockQuery>

  beforeEach(() => {
    mockQuery = buildMockQuery()
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockQuery),
        }),
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
  })

  it('STOR-01: passes textSearch fts query when q param is provided', async () => {
    await getListings({ q: 'Honda' })
    expect(mockQuery.textSearch).toHaveBeenCalledWith('fts', 'Honda', { config: 'simple', type: 'websearch' })
  })

  it('STOR-01: does not call textSearch when q is empty string', async () => {
    await getListings({ q: '' })
    expect(mockQuery.textSearch).not.toHaveBeenCalled()
  })

  it('STOR-02: applies .in("make", makes) when makes array is non-empty', async () => {
    await getListings({ makes: ['Honda', 'Toyota'] })
    expect(mockQuery.in).toHaveBeenCalledWith('make', ['Honda', 'Toyota'])
  })

  it('STOR-02: applies .gte("year", yearMin) when yearMin is set', async () => {
    await getListings({ yearMin: 2020 })
    expect(mockQuery.gte).toHaveBeenCalledWith('year', 2020)
  })

  it('STOR-02: applies .lte("year", yearMax) when yearMax is set', async () => {
    await getListings({ yearMax: 2023 })
    expect(mockQuery.lte).toHaveBeenCalledWith('year', 2023)
  })

  it('STOR-02: applies .gte("price_cents", priceMin * 100) when priceMin is set', async () => {
    await getListings({ priceMin: 10000 })
    expect(mockQuery.gte).toHaveBeenCalledWith('price_cents', 1000000)
  })

  it('STOR-02: applies .lte("price_cents", priceMax * 100) when priceMax is set', async () => {
    await getListings({ priceMax: 50000 })
    expect(mockQuery.lte).toHaveBeenCalledWith('price_cents', 5000000)
  })

  it('STOR-02: applies .lte("mileage", mileageMax) when mileageMax is set', async () => {
    await getListings({ mileageMax: 100000 })
    expect(mockQuery.lte).toHaveBeenCalledWith('mileage', 100000)
  })

  it('STOR-02: applies .not("condition_notes", "is", null) when hasNotes is "true"', async () => {
    await getListings({ hasNotes: 'true' })
    expect(mockQuery.not).toHaveBeenCalledWith('condition_notes', 'is', null)
  })

  it('STOR-03: orders by price_cents ascending when sort=price_asc', async () => {
    await getListings({ sort: 'price_asc' })
    expect(mockQuery.order).toHaveBeenCalledWith('price_cents', { ascending: true })
  })

  it('STOR-03: orders by price_cents descending when sort=price_desc', async () => {
    await getListings({ sort: 'price_desc' })
    expect(mockQuery.order).toHaveBeenCalledWith('price_cents', { ascending: false })
  })

  it('STOR-03: orders by mileage ascending when sort=mileage_asc', async () => {
    await getListings({ sort: 'mileage_asc' })
    expect(mockQuery.order).toHaveBeenCalledWith('mileage', { ascending: true })
  })

  it('STOR-03: orders by created_at descending when sort=newest (default)', async () => {
    await getListings({ sort: 'newest' })
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('STOR-04: calls .range(0, 11) for page=1 (PAGE_SIZE=12)', async () => {
    await getListings({ page: 1 })
    expect(mockQuery.range).toHaveBeenCalledWith(0, 11)
  })

  it('STOR-04: calls .range(12, 23) for page=2', async () => {
    await getListings({ page: 2 })
    expect(mockQuery.range).toHaveBeenCalledWith(12, 23)
  })

  it('STOR-04: returns { listings, total, pageSize } shape', async () => {
    vi.mocked(mockQuery.range as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: '1' }],
      count: 42,
      error: null,
    })
    const result = await getListings({})
    expect(result).toMatchObject({ listings: expect.any(Array), total: 42, pageSize: PAGE_SIZE })
  })
})
