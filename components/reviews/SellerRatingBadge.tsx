import Link from 'next/link'
import type { SellerStats } from '@/lib/queries/reviews'

interface SellerRatingBadgeProps {
  stats: SellerStats
  sellerId: string
}

export function SellerRatingBadge({ stats, sellerId }: SellerRatingBadgeProps) {
  if (!stats) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[#a8a29e]">
        <span>★</span>
        <span>No reviews yet</span>
      </span>
    )
  }

  return (
    <Link
      href={`/sellers/${sellerId}`}
      className="inline-flex items-center gap-1.5 text-sm text-[#57534e] hover:text-[#1c1917] transition-colors"
    >
      <span className="text-[#ca8a04]">★</span>
      <span className="font-medium">{stats.avg_rating}</span>
      <span className="text-[#a8a29e]">·</span>
      <span>{stats.review_count} {stats.review_count === 1 ? 'review' : 'reviews'}</span>
    </Link>
  )
}
