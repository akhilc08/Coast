import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicSellerProfile, getSellerStats, getReviewsForSeller } from '@/lib/queries/reviews'
import { StarRating } from '@/components/reviews/StarRating'
import { ReviewCard } from '@/components/reviews/ReviewCard'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const seller = await getPublicSellerProfile(id)
  const name = seller?.company ?? seller?.full_name ?? 'Seller'
  return { title: `${name} — Coast` }
}

export default async function SellerProfilePage({ params, searchParams }: Props) {
  const { id } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  const [seller, stats, { reviews, hasNextPage }] = await Promise.all([
    getPublicSellerProfile(id),
    getSellerStats(id),
    getReviewsForSeller(id, page),
  ])

  if (!seller) notFound()

  // Get current user to show seller reply controls
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isSeller = user?.app_metadata?.role === 'wholesaler' && user?.id === id

  const displayName = seller.company ?? seller.full_name ?? 'Seller'

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Seller header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1c1917]">{displayName}</h1>
        {seller.company && seller.full_name && (
          <p className="mt-1 text-sm text-[#78716c]">{seller.full_name}</p>
        )}

          {/* Aggregate rating */}
        <div className="mt-3">
          {stats ? (
            <div className="flex items-center gap-2">
              <StarRating rating={Math.round(stats.avg_rating)} />
              <span className="text-sm font-medium text-[#1c1917]">{stats.avg_rating}</span>
              <span className="text-sm text-[#a8a29e]">
                ({stats.review_count} {stats.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          ) : (
            <p className="text-sm text-[#a8a29e]">No reviews yet</p>
          )}
        </div>

        {/* Bio */}
        {seller.bio && (
          <p className="mt-5 text-sm leading-relaxed text-[#57534e] max-w-xl">{seller.bio}</p>
        )}
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-[#a8a29e]">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={isSeller ? user!.id : undefined}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 1 || hasNextPage) && (
        <div className="mt-8 flex justify-between">
          {page > 1 ? (
            <a
              href={`/sellers/${id}?page=${page - 1}`}
              className="text-sm text-[#78716c] hover:text-[#1c1917] transition-colors"
            >
              ← Newer
            </a>
          ) : (
            <span />
          )}
          {hasNextPage && (
            <a
              href={`/sellers/${id}?page=${page + 1}`}
              className="text-sm text-[#78716c] hover:text-[#1c1917] transition-colors"
            >
              Older →
            </a>
          )}
        </div>
      )}
    </main>
  )
}
