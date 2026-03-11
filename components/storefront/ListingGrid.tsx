import { ListingCard } from './ListingCard'

interface Listing {
  id: string
  make: string | null
  model: string | null
  year: number | null
  mileage: number | null
  price_cents: number | null
  grade: string | null
  listing_photos: { storage_key: string; position: number }[]
}

interface ListingGridProps {
  listings: Listing[]
  supabaseUrl: string
}

export function ListingGrid({ listings, supabaseUrl }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
        <p className="text-sm text-zinc-500">No listings match your filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map(listing => {
        const heroPhoto = listing.listing_photos
          ?.sort((a, b) => a.position - b.position)[0]

        return (
          <ListingCard
            key={listing.id}
            id={listing.id}
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
