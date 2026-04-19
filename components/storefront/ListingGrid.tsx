import { ListingCard } from './ListingCard'
import type { SellerStats } from '@/lib/queries/reviews'
import { PHOTO_SLOT_ORDER } from '@/lib/photo-slots'

interface Listing {
  id: string
  seller_id: string | null
  make: string | null
  model: string | null
  year: number | null
  mileage: number | null
  price_cents: number | null
  grade: string | null
  listing_photos: { storage_key: string; position: number; slot_type?: string | null }[]
}

interface ListingGridProps {
  listings: Listing[]
  supabaseUrl: string
  sellerStatsMap: Map<string, SellerStats>
}

export function ListingGrid({ listings, supabaseUrl, sellerStatsMap }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-[#e5e7eb] bg-[#f8fafc]">
        <p className="text-sm text-[#94a3b8]">No listings match your filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map(listing => {
        const heroPhoto = listing.listing_photos
          ?.slice()
          .sort((a, b) => {
            const ai = a.slot_type != null ? (PHOTO_SLOT_ORDER[a.slot_type] ?? 999) : a.position
            const bi = b.slot_type != null ? (PHOTO_SLOT_ORDER[b.slot_type] ?? 999) : b.position
            return ai - bi
          })[0]

        return (
          <ListingCard
            key={listing.id}
            id={listing.id}
            sellerId={listing.seller_id}
            sellerStats={listing.seller_id ? (sellerStatsMap.get(listing.seller_id) ?? null) : null}
            make={listing.make}
            model={listing.model}
            year={listing.year}
            mileage={listing.mileage}
            price_cents={listing.price_cents}
            grade={listing.grade}
            heroStorageKey={heroPhoto?.storage_key ?? null}
            supabaseUrl={supabaseUrl}
          />
        )
      })}
    </div>
  )
}
