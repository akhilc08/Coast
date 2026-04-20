import { getListings, PAGE_SIZE } from '@/lib/queries/listings'
import { getSellerStatsBulk } from '@/lib/queries/reviews'
import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/storefront/SearchBar'
import { StorefrontFilters } from '@/components/storefront/StorefrontFilters'
import { FilterDrawer } from '@/components/storefront/FilterDrawer'
import { ActiveFilterChips } from '@/components/storefront/ActiveFilterChips'
import { ListingGrid } from '@/components/storefront/ListingGrid'
import { Pagination } from '@/components/storefront/Pagination'

interface SearchParams {
  q?: string
  makes?: string | string[]
  yearMin?: string
  yearMax?: string
  priceMin?: string
  priceMax?: string
  mileageMax?: string
  hasNotes?: string
  sort?: string
  page?: string
}

function parseFilters(params: SearchParams) {
  const makes = params.makes
    ? (Array.isArray(params.makes) ? params.makes : [params.makes])
    : []

  return {
    q:          params.q ?? '',
    makes,
    yearMin:    params.yearMin    ? parseInt(params.yearMin)    : null,
    yearMax:    params.yearMax    ? parseInt(params.yearMax)    : null,
    priceMin:   params.priceMin   ? parseInt(params.priceMin)   : null,
    priceMax:   params.priceMax   ? parseInt(params.priceMax)   : null,
    mileageMax: params.mileageMax ? parseInt(params.mileageMax) : null,
    hasNotes:   params.hasNotes ?? null,
    sort:       (params.sort ?? 'newest') as 'newest' | 'price_asc' | 'price_desc' | 'mileage_asc',
    page:       params.page ? parseInt(params.page) : 1,
  }
}

export default async function StorefrontPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const filters = parseFilters(params)

  const [{ listings, total }, makesResult] = await Promise.all([
    getListings(filters),
    (async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('listings')
        .select('make')
        .eq('status', 'active')
        .not('make', 'is', null)
      const MAKE_DISPLAY: Record<string, string> = {
        'acura': 'Acura', 'alfa romeo': 'Alfa Romeo', 'aston martin': 'Aston Martin',
        'audi': 'Audi', 'bentley': 'Bentley', 'bmw': 'BMW', 'buick': 'Buick',
        'cadillac': 'Cadillac', 'chevrolet': 'Chevrolet', 'chevy': 'Chevrolet',
        'chrysler': 'Chrysler', 'dodge': 'Dodge', 'ferrari': 'Ferrari', 'fiat': 'Fiat',
        'ford': 'Ford', 'genesis': 'Genesis', 'gmc': 'GMC', 'honda': 'Honda',
        'hyundai': 'Hyundai', 'infiniti': 'Infiniti', 'jaguar': 'Jaguar', 'jeep': 'Jeep',
        'kia': 'Kia', 'lamborghini': 'Lamborghini', 'land rover': 'Land Rover',
        'lexus': 'Lexus', 'lincoln': 'Lincoln', 'maserati': 'Maserati', 'mazda': 'Mazda',
        'mclaren': 'McLaren', 'mercedes': 'Mercedes-Benz', 'mercedes-benz': 'Mercedes-Benz',
        'mini': 'MINI', 'mitsubishi': 'Mitsubishi', 'nissan': 'Nissan', 'porsche': 'Porsche',
        'ram': 'Ram', 'rolls-royce': 'Rolls-Royce', 'rolls royce': 'Rolls-Royce',
        'subaru': 'Subaru', 'tesla': 'Tesla', 'toyota': 'Toyota', 'volkswagen': 'Volkswagen',
        'vw': 'Volkswagen', 'volvo': 'Volvo',
      }
      const seen = new Map<string, string>()
      for (const r of data ?? []) {
        const raw = (r.make as string).trim()
        const key = raw.toLowerCase()
        const display = MAKE_DISPLAY[key] ?? raw.split(/[\s-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        if (!seen.has(key)) seen.set(key, display)
      }
      return [...seen.values()].sort((a, b) => a.localeCompare(b))
    })(),
  ])

  const sellerIds = [...new Set(listings.map(l => l.seller_id).filter(Boolean) as string[])]
  const sellerStatsMap = await getSellerStatsBulk(sellerIds)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Search bar */}
      <div className="mb-4">
        <SearchBar />
      </div>

      {/* Active filter chips */}
      <div className="mb-4">
        <ActiveFilterChips />
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar filters */}
        <aside className="hidden w-56 shrink-0 md:block">
          <StorefrontFilters makes={makesResult} />
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Mobile: filter button + result count */}
          <div className="mb-4 flex items-center justify-between md:justify-end">
            <FilterDrawer makes={makesResult} />
            <p className="text-sm text-zinc-500">{total.toLocaleString()} vehicle{total !== 1 ? 's' : ''}</p>
          </div>

          <ListingGrid listings={listings} supabaseUrl={supabaseUrl} sellerStatsMap={sellerStatsMap} />
          <Pagination total={total} pageSize={PAGE_SIZE} />
        </div>
      </div>
    </main>
  )
}
