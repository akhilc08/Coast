import { describe, it } from 'vitest'

// Target: lib/queries/listings.ts (created in 02-03)
// import { getListings } from '@/lib/queries/listings'

// The real getListings creates a Supabase server client — mock at module level in real tests
// Stubs below describe the expected query behavior contract

describe('getListings query builder (STOR-01 to STOR-04)', () => {
  it.todo('STOR-01: passes textSearch fts query when q param is provided')
  it.todo('STOR-01: does not call textSearch when q is empty string')
  it.todo('STOR-02: applies .in("make", makes) when makes array is non-empty')
  it.todo('STOR-02: applies .gte("year", yearMin) when yearMin is set')
  it.todo('STOR-02: applies .lte("year", yearMax) when yearMax is set')
  it.todo('STOR-02: applies .gte("price_cents", priceMin * 100) when priceMin is set')
  it.todo('STOR-02: applies .lte("price_cents", priceMax * 100) when priceMax is set')
  it.todo('STOR-02: applies .lte("mileage", mileageMax) when mileageMax is set')
  it.todo('STOR-02: applies .not("condition_notes", "is", null) when hasNotes is "true"')
  it.todo('STOR-03: orders by price_cents ascending when sort=price_asc')
  it.todo('STOR-03: orders by price_cents descending when sort=price_desc')
  it.todo('STOR-03: orders by mileage ascending when sort=mileage_asc')
  it.todo('STOR-03: orders by created_at descending when sort=newest (default)')
  it.todo('STOR-04: calls .range(0, 11) for page=1 (PAGE_SIZE=12)')
  it.todo('STOR-04: calls .range(12, 23) for page=2')
  it.todo('STOR-04: returns { listings, total, pageSize } shape')
})
