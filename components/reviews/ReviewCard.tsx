import { StarRating } from './StarRating'
import { SellerReplyForm } from './SellerReplyForm'
import type { ReviewWithBuyerName } from '@/lib/queries/reviews'

interface ReviewCardProps {
  review: ReviewWithBuyerName
  /** Pass the current seller user ID to show the reply button */
  currentUserId?: string
}

export function ReviewCard({ review, currentUserId }: ReviewCardProps) {
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(review.created_at))

  const isThisSeller = currentUserId === review.seller_id
  const canReply = isThisSeller && review.seller_reply === null

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <StarRating rating={review.rating} />
          <p className="mt-1 text-sm font-medium text-[#1c1917]">{review.buyerDisplayName}</p>
        </div>
        <time className="text-xs text-[#a8a29e] shrink-0">{date}</time>
      </div>

      {/* Body */}
      <p className="text-sm text-[#57534e] leading-relaxed">{review.body}</p>

      {/* Seller reply */}
      {review.seller_reply && (
        <div className="ml-4 border-l-2 border-[#e7e5e4] pl-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Seller Response</p>
          <p className="text-sm text-[#57534e] leading-relaxed">{review.seller_reply}</p>
        </div>
      )}

      {/* Reply form — only for the seller on unreplied reviews */}
      {canReply && (
        <div className="ml-4 border-l-2 border-[#e7e5e4] pl-4">
          <SellerReplyForm reviewId={review.id} />
        </div>
      )}
    </div>
  )
}
