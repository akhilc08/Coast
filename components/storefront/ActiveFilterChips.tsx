'use client'

import { useQueryStates, parseAsInteger, parseAsArrayOf, parseAsString, parseAsStringEnum } from 'nuqs'
import { X } from 'lucide-react'

const sortValues = ['newest', 'price_asc', 'price_desc', 'mileage_asc'] as const

export function ActiveFilterChips() {
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

  const chips: { label: string; clear: () => void }[] = []

  filters.makes.forEach(make =>
    chips.push({ label: make, clear: () => setFilters({ makes: filters.makes.filter(m => m !== make), page: 1 }) })
  )
  if (filters.yearMin) chips.push({ label: `From ${filters.yearMin}`, clear: () => setFilters({ yearMin: null, page: 1 }) })
  if (filters.yearMax) chips.push({ label: `To ${filters.yearMax}`, clear: () => setFilters({ yearMax: null, page: 1 }) })
  if (filters.priceMin) chips.push({ label: `$${filters.priceMin}+`, clear: () => setFilters({ priceMin: null, page: 1 }) })
  if (filters.priceMax) chips.push({ label: `Under $${filters.priceMax}`, clear: () => setFilters({ priceMax: null, page: 1 }) })
  if (filters.mileageMax) chips.push({ label: `Under ${filters.mileageMax.toLocaleString()} mi`, clear: () => setFilters({ mileageMax: null, page: 1 }) })
  if (filters.hasNotes === 'true') chips.push({ label: 'Has notes', clear: () => setFilters({ hasNotes: null, page: 1 }) })
  if (filters.sort !== 'newest') {
    const labels: Record<string, string> = { price_asc: 'Price: low-high', price_desc: 'Price: high-low', mileage_asc: 'Lowest mileage' }
    chips.push({ label: labels[filters.sort], clear: () => setFilters({ sort: 'newest', page: 1 }) })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={chip.clear}
          className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-red-700 hover:text-red-300"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  )
}
