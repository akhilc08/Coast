import { createClient } from '@/lib/supabase/server'

export interface ListingFilters {
  q?:          string
  makes?:      string[]
  yearMin?:    number | null
  yearMax?:    number | null
  priceMin?:   number | null
  priceMax?:   number | null
  mileageMax?: number | null
  hasNotes?:   string | null
  sort?:       'newest' | 'price_asc' | 'price_desc' | 'mileage_asc'
  page?:       number
}

export const PAGE_SIZE = 12

export async function getListings(filters: ListingFilters = {}) {
  const supabase = await createClient()
  const {
    q = '', makes = [], yearMin, yearMax, priceMin, priceMax,
    mileageMax, hasNotes, sort = 'newest', page = 1,
  } = filters

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('listings')
    .select(
      'id, seller_id, make, model, year, mileage, price_cents, grade, condition_notes, created_at, listing_photos(id, storage_key, position)',
      { count: 'exact' }
    )
    .eq('status', 'active')

  if (q.trim())           query = query.textSearch('fts', q.trim(), { config: 'simple', type: 'websearch' })
  if (makes.length)       query = query.in('make', makes)
  if (yearMin != null)    query = query.gte('year', yearMin)
  if (yearMax != null)    query = query.lte('year', yearMax)
  if (priceMin != null)   query = query.gte('price_cents', priceMin * 100)
  if (priceMax != null)   query = query.lte('price_cents', priceMax * 100)
  if (mileageMax != null) query = query.lte('mileage', mileageMax)
  if (hasNotes === 'true') query = query.not('condition_notes', 'is', null)

  const orderCol = sort === 'price_asc' || sort === 'price_desc' ? 'price_cents'
    : sort === 'mileage_asc' ? 'mileage'
    : 'created_at'
  const ascending = sort === 'price_asc' || sort === 'mileage_asc'

  query = query.order(orderCol, { ascending }).range(from, to)

  const { data, count, error } = await query
  if (error) throw error

  return { listings: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE }
}

export async function getListing(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('listings')
    .select(
      '*, ai_condition_exterior, ai_condition_interior, ai_condition_mechanical, ai_condition_tires, condition_locked, condition_pdf_key, listing_photos(id, storage_key, position, slot_type), listing_documents(id, storage_key, document_type, file_name)'
    )
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (error) return null
  return data
}
