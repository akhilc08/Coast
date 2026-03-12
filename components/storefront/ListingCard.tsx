import Link from 'next/link'
import Image from 'next/image'
import { GradeBadge } from '@/components/ui/GradeBadge'
import type { SellerStats } from '@/lib/queries/reviews'

interface ListingCardProps {
  id: string
  sellerId: string | null
  sellerStats: SellerStats
  make: string | null
  model: string | null
  year: number | null
  mileage: number | null
  price_cents: number | null
  grade: string | null
  heroStorageKey: string | null
  supabaseUrl: string
}

export function ListingCard({ id, sellerId, sellerStats, make, model, year, mileage, price_cents, grade, heroStorageKey, supabaseUrl }: ListingCardProps) {
  // Construct thumbnail URL via Supabase image transformation (CDN-optimized)
  const heroUrl = heroStorageKey
    ? `${supabaseUrl}/storage/v1/render/image/public/car-photos/${heroStorageKey}?width=600&height=450&resize=cover`
    : null

  return (
    <Link href={`/listings/${id}`} className="group block">
      <div className="overflow-hidden rounded-xl border border-[#e7e5e4] bg-white transition-shadow hover:shadow-md">
        {/* Hero photo */}
        <div className="relative aspect-[4/3] bg-[#f5f5f4]">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={`${year} ${make} ${model}`}
              fill
              className="object-cover transition-opacity group-hover:opacity-90"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#a8a29e]">No photo</div>
          )}
        </div>

        {/* Card details */}
        <div className="space-y-2 p-3">
          <p className="font-medium leading-tight text-[#1c1917]">
            {year} {make} {model}
          </p>

          <div className="flex items-center justify-between">
            <p className="text-xs text-[#78716c]">
              {mileage != null ? `${mileage.toLocaleString()} mi` : 'Mileage N/A'}
            </p>
            <GradeBadge grade={grade} />
          </div>

          <p className="text-base font-semibold text-[#1c1917]">
            {price_cents != null ? `$${(price_cents / 100).toLocaleString()}` : 'Call for price'}
          </p>

          {sellerId && (
            sellerStats ? (
              <p className="inline-flex items-center gap-1 text-xs text-[#78716c]">
                <span className="text-[#ca8a04]">★</span>
                <span className="font-medium">{sellerStats.avg_rating}</span>
                <span className="text-[#a8a29e]">·</span>
                <span>{sellerStats.review_count} {sellerStats.review_count === 1 ? 'review' : 'reviews'}</span>
              </p>
            ) : (
              <p className="text-xs text-[#a8a29e]">★ No reviews yet</p>
            )
          )}
        </div>
      </div>
    </Link>
  )
}
