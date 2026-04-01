import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Gauge, Heart } from 'lucide-react'

interface ListingCardProps {
  id: string
  sellerId: string | null
  sellerStats: { avg_rating: number; review_count: number } | null
  make: string | null
  model: string | null
  year: number | null
  mileage: number | null
  price_cents: number | null
  grade: string | null
  heroStorageKey: string | null
  supabaseUrl: string
}

function gradeBadgeStyle(grade: string | null) {
  switch (grade?.toUpperCase()) {
    case 'A': return 'bg-[#dcfce7] text-[#15803d]'
    case 'B': return 'bg-[#fef9c3] text-[#a16207]'
    case 'C': return 'bg-[#fee2e2] text-[#b91c1c]'
    default:  return 'bg-[#f1f5f9] text-[#64748b]'
  }
}

export function ListingCard({
  id, make, model, year, mileage, price_cents, grade, heroStorageKey, supabaseUrl
}: ListingCardProps) {
  const heroUrl = heroStorageKey
    ? `${supabaseUrl}/storage/v1/object/public/car-photos/${heroStorageKey}`
    : null

  const price = price_cents != null
    ? `$${(price_cents / 100).toLocaleString()}`
    : 'Call for price'

  return (
    <Link href={`/listings/${id}`} className="group block">
      <div className="overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white transition-all duration-200 hover:-translate-y-[3px] hover:border-[#bfdbfe] hover:shadow-[0_8px_25px_-5px_rgba(37,99,235,0.15),0_4px_10px_-4px_rgba(0,0,0,0.08)]">

        {/* Image */}
        <div className="relative h-[180px] overflow-hidden bg-[#f1f5f9]">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={`${year} ${make} ${model}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#94a3b8]">No photo</div>
          )}

          {/* Grade badge */}
          {grade && (
            <span className={`absolute left-[10px] top-[10px] rounded-[6px] px-[10px] py-[4px] text-[11px] font-bold tracking-[0.3px] ${gradeBadgeStyle(grade)}`}>
              Grade {grade.toUpperCase()}
            </span>
          )}

          {/* Save button */}
          <div className="absolute right-[10px] top-[10px] flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#94a3b8] backdrop-blur-sm">
            <Heart size={14} />
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6b7280]">
            {make ?? '—'}
          </p>
          <p className="mb-2 text-[16px] font-bold leading-tight tracking-[-0.3px] text-[#0f172a]">
            {year} {make} {model}
          </p>

          {/* Year + mileage */}
          <div className="mb-[14px] flex gap-3">
            <span className="flex items-center gap-1 text-[12px] text-[#6b7280]">
              <Calendar size={12} />
              {year ?? '—'}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-[#6b7280]">
              <Gauge size={12} />
              {mileage != null ? `${mileage.toLocaleString()} mi` : 'N/A'}
            </span>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-3">
            <span className="text-[20px] font-extrabold tracking-[-0.5px] text-[#0f172a]">
              {price}
            </span>
            <button className="rounded-[8px] bg-[#eff6ff] px-[14px] py-[7px] text-[13px] font-semibold text-[#2563eb] transition-colors group-hover:bg-[#2563eb] group-hover:text-white">
              Buy Now
            </button>
          </div>
        </div>

      </div>
    </Link>
  )
}
