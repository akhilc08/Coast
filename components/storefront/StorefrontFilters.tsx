'use client'

import { useQueryStates, parseAsInteger, parseAsArrayOf, parseAsString, parseAsStringEnum } from 'nuqs'

const sortValues = ['newest', 'price_asc', 'price_desc', 'mileage_asc'] as const

const inputCls = "w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-[#1c1917] placeholder:text-[#a8a29e] focus:border-[#1c1917] focus:outline-none"

export function StorefrontFilters({ makes }: { makes: string[] }) {
  const [filters, setFilters] = useQueryStates({
    makes:      parseAsArrayOf(parseAsString).withDefault([]),
    yearMin:    parseAsInteger,
    yearMax:    parseAsInteger,
    priceMin:   parseAsInteger,
    priceMax:   parseAsInteger,
    mileageMax: parseAsInteger,
    hasNotes:   parseAsString,
    sort:       parseAsStringEnum([...sortValues]).withDefault('newest'),
    page:       parseAsInteger.withDefault(1),
  }, { shallow: false })

  function toggleMake(make: string) {
    const next = filters.makes.includes(make)
      ? filters.makes.filter(m => m !== make)
      : [...filters.makes, make]
    setFilters({ makes: next, page: 1 })
  }

  return (
    <div className="space-y-6 text-sm">
      {/* Sort */}
      <div>
        <p className="mb-2 font-medium text-[#1c1917]">Sort by</p>
        <select
          value={filters.sort}
          onChange={e => setFilters({ sort: e.target.value as typeof filters.sort, page: 1 })}
          className={inputCls}
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="mileage_asc">Lowest mileage</option>
        </select>
      </div>

      {/* Make checkboxes */}
      {makes.length > 0 && (
        <div>
          <p className="mb-2 font-medium text-[#1c1917]">Make</p>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {makes.map(make => (
              <label key={make} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.makes.includes(make)}
                  onChange={() => toggleMake(make)}
                  className="rounded border-[#d6d3d1] text-blue-600"
                />
                <span className="text-[#44403c]">{make}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Year range */}
      <div>
        <p className="mb-2 font-medium text-[#1c1917]">Year</p>
        <div className="flex gap-2">
          <input
            type="number" placeholder="Min"
            value={filters.yearMin ?? ''}
            onChange={e => setFilters({ yearMin: e.target.value ? parseInt(e.target.value) : null, page: 1 })}
            className={inputCls}
          />
          <input
            type="number" placeholder="Max"
            value={filters.yearMax ?? ''}
            onChange={e => setFilters({ yearMax: e.target.value ? parseInt(e.target.value) : null, page: 1 })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Price range */}
      <div>
        <p className="mb-2 font-medium text-[#1c1917]">Price ($)</p>
        <div className="flex gap-2">
          <input
            type="number" placeholder="Min"
            value={filters.priceMin ?? ''}
            onChange={e => setFilters({ priceMin: e.target.value ? parseInt(e.target.value) : null, page: 1 })}
            className={inputCls}
          />
          <input
            type="number" placeholder="Max"
            value={filters.priceMax ?? ''}
            onChange={e => setFilters({ priceMax: e.target.value ? parseInt(e.target.value) : null, page: 1 })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Mileage max */}
      <div>
        <p className="mb-2 font-medium text-[#1c1917]">Max Mileage</p>
        <input
          type="number" placeholder="e.g. 100000"
          value={filters.mileageMax ?? ''}
          onChange={e => setFilters({ mileageMax: e.target.value ? parseInt(e.target.value) : null, page: 1 })}
          className={inputCls}
        />
      </div>

      {/* Condition notes filter */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={filters.hasNotes === 'true'}
          onChange={e => setFilters({ hasNotes: e.target.checked ? 'true' : null, page: 1 })}
          className="rounded border-[#d6d3d1] text-blue-600"
        />
        <span className="text-[#44403c]">Has condition notes</span>
      </label>

      {/* Clear all */}
      <button
        onClick={() => setFilters({ makes: [], yearMin: null, yearMax: null, priceMin: null, priceMax: null, mileageMax: null, hasNotes: null, sort: 'newest', page: 1 })}
        className="w-full rounded-lg border border-[#e7e5e4] py-2 text-sm text-[#78716c] transition-colors hover:border-[#1c1917] hover:text-[#1c1917]"
      >
        Clear all filters
      </button>
    </div>
  )
}
