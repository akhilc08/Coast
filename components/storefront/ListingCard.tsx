import Link from 'next/link'
import Image from 'next/image'
import { GradeBadge } from '@/components/ui/GradeBadge'

interface ListingCardProps {
  id: string
  make: string | null
  model: string | null
  year: number | null
  mileage: number | null
  price_cents: number | null
  grade: string | null
  heroStorageKey: string | null
  supabaseUrl: string
}

export function ListingCard({ id, make, model, year, mileage, price_cents, grade, heroStorageKey, supabaseUrl }: ListingCardProps) {
  // Construct thumbnail URL via Supabase image transformation (CDN-optimized)
  const heroUrl = heroStorageKey
    ? `${supabaseUrl}/storage/v1/render/image/public/car-photos/${heroStorageKey}?width=600&height=450&resize=cover`
    : null

  return (
    <Link href={`/listings/${id}`} className="group block">
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
        {/* Hero photo */}
        <div className="relative aspect-[4/3] bg-zinc-800">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={`${year} ${make} ${model}`}
              fill
              className="object-cover transition-opacity group-hover:opacity-90"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-600">No photo</div>
          )}
        </div>

        {/* Card details */}
        <div className="space-y-2 p-3">
          <p className="font-medium leading-tight text-zinc-100">
            {year} {make} {model}
          </p>

          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {mileage != null ? `${mileage.toLocaleString()} mi` : 'Mileage N/A'}
            </p>
            <GradeBadge grade={grade} />
          </div>

          <p className="text-base font-semibold text-zinc-100">
            {price_cents != null ? `$${(price_cents / 100).toLocaleString()}` : 'Call for price'}
          </p>
        </div>
      </div>
    </Link>
  )
}
