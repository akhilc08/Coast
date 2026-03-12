interface StarRatingProps {
  rating: number  // 1–5
  size?: 'sm' | 'md'
}

export function StarRating({ rating, size = 'md' }: StarRatingProps) {
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={`inline-flex gap-0.5 ${sizeClass}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden className={n <= rating ? 'text-[#ca8a04]' : 'text-[#d6d3d1]'}>
          ★
        </span>
      ))}
    </span>
  )
}
