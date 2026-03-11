import { getListings, PAGE_SIZE } from '@/lib/queries/listings'
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
      return [...new Set((data ?? []).map(r => r.make as string))].sort()
    })(),
  ])

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

          <ListingGrid listings={listings} supabaseUrl={supabaseUrl} />
          <Pagination total={total} pageSize={PAGE_SIZE} />
        </div>
      </div>
    </main>
  )
}
