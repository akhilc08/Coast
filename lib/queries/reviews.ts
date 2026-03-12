import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatBuyerName } from '@/lib/utils/formatBuyerName'
import type { Review } from '@/lib/validations/review'

const PAGE_SIZE = 10

export type SellerStats = {
  avg_rating: number
  review_count: number
} | null

export type ReviewWithBuyerName = Review & { buyerDisplayName: string }

export type PublicSellerProfile = {
  id: string
  full_name: string | null
  company: string | null
}

/**
 * Fetches aggregate rating stats for a seller.
 * Returns null if the seller has no reviews.
 * Uses the admin client because seller_review_stats is server-side only (no public GRANT).
 */
export async function getSellerStats(sellerId: string): Promise<SellerStats> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_review_stats')
    .select('avg_rating, review_count')
    .eq('seller_id', sellerId)
    .single()

  if (!data) return null
  return { avg_rating: Number(data.avg_rating), review_count: Number(data.review_count) }
}

/**
 * Fetches aggregate rating stats for multiple sellers in one query.
 * Returns a Map from sellerId → SellerStats (null entry means no reviews).
 */
export async function getSellerStatsBulk(sellerIds: string[]): Promise<Map<string, SellerStats>> {
  if (sellerIds.length === 0) return new Map()
  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_review_stats')
    .select('seller_id, avg_rating, review_count')
    .in('seller_id', sellerIds)

  const map = new Map<string, SellerStats>()
  for (const row of data ?? []) {
    map.set(row.seller_id, { avg_rating: Number(row.avg_rating), review_count: Number(row.review_count) })
  }
  return map
}

/**
 * Fetches one page of reviews for a seller (10 per page, newest first).
 * Uses LIMIT 11 to detect if a next page exists without a COUNT query.
 * Returns reviews with buyer display names resolved via service role.
 */
export async function getReviewsForSeller(
  sellerId: string,
  page: number
): Promise<{ reviews: ReviewWithBuyerName[]; hasNextPage: boolean }> {
  const supabase = await createClient()
  const offset = (page - 1) * PAGE_SIZE

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE) // fetches PAGE_SIZE + 1 rows

  if (error || !data) return { reviews: [], hasNextPage: false }

  const hasNextPage = data.length > PAGE_SIZE
  const pageRows = hasNextPage ? data.slice(0, PAGE_SIZE) : data

  // Fetch buyer names via service role (consumer profiles have no public RLS policy)
  const buyerIds = [...new Set(pageRows.map((r) => r.buyer_id))]
  const admin = createAdminClient()
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', buyerIds)

  const nameMap = new Map((profileRows ?? []).map((p) => [p.id, p.full_name as string | null]))

  const reviews: ReviewWithBuyerName[] = pageRows.map((r) => ({
    ...(r as Review),
    buyerDisplayName: formatBuyerName(nameMap.get(r.buyer_id) ?? null),
  }))

  return { reviews, hasNextPage }
}

/**
 * Fetches the public seller profile (name + company only) from the restricted view.
 * Returns null if the seller doesn't exist or is not a wholesaler.
 */
export async function getPublicSellerProfile(sellerId: string): Promise<PublicSellerProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('public_seller_profiles')
    .select('id, full_name, company')
    .eq('id', sellerId)
    .single()

  return data ?? null
}

/**
 * Fetches the review for a specific order, if one exists.
 */
export async function getReviewForOrder(orderId: string): Promise<Review | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('order_id', orderId)
    .single()

  return (data as Review | null) ?? null
}
