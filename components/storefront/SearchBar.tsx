'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Search } from 'lucide-react'

export function SearchBar() {
  const [q, setQ] = useQueryState('q', parseAsString.withDefault('').withOptions({ shallow: false, throttleMs: 400 }))

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a29e]" />
      <input
        type="search"
        value={q}
        onChange={e => setQ(e.target.value || null)}
        placeholder="Search by make, model, or year..."
        className="w-full rounded-lg border border-[#e7e5e4] bg-white py-2 pl-9 pr-4 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-[#1c1917] focus:outline-none"
      />
    </div>
  )
}
