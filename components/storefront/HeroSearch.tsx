'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Search } from 'lucide-react'

const FILTER_PILLS = [
  { label: 'All Vehicles',  params: {} },
  { label: 'SUVs',          params: { q: 'SUV' } },
  { label: 'Trucks',        params: { q: 'truck' } },
  { label: 'Sedans',        params: { q: 'sedan' } },
  { label: 'Luxury',        params: { q: 'luxury' } },
  { label: 'Under $20k',    params: { priceMax: '20000' } },
  { label: 'Grade A',       params: { grade: 'A' } },
]

export function HeroSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const [priceFilter, setPriceFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Vehicles')

  function buildUrl(extra: Record<string, string> = {}, mobile = false) {
    const params = new URLSearchParams()
    const q = (mobile ? mobileInputRef.current?.value.trim() : inputRef.current?.value.trim())
    if (q) params.set('q', q)
    if (priceFilter) {
      if (priceFilter === 'u15') params.set('priceMax', '15000')
      else if (priceFilter === '15-25') { params.set('priceMin', '15000'); params.set('priceMax', '25000') }
      else if (priceFilter === '25-40') { params.set('priceMin', '25000'); params.set('priceMax', '40000') }
      else if (priceFilter === 'o40') params.set('priceMin', '40000')
    }
    Object.entries(extra).forEach(([k, v]) => params.set(k, v))
    return `/inventory${params.size ? `?${params}` : ''}`
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildUrl())
  }

  function handlePill(pill: typeof FILTER_PILLS[0]) {
    setActiveFilter(pill.label)
    router.push(buildUrl(pill.params as Record<string, string>))
  }

  return (
    <div className="relative">
      {/* Desktop search bar */}
      <form
        onSubmit={handleSearch}
        className="mx-auto mb-8 hidden sm:flex max-w-[680px] items-center gap-3 rounded-[16px] bg-white px-5 py-2 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_20px_40px_-8px_rgba(37,99,235,0.12),0_0_0_1px_rgba(0,0,0,0.06)]"
      >
        <Search size={18} className="shrink-0 text-[#9ca3af]" />
        <input
          ref={inputRef}
          placeholder="Search make, model, or keyword…"
          className="flex-1 bg-transparent text-[16px] text-[#111] outline-none placeholder:text-[#9ca3af]"
        />
        <div className="h-7 w-px bg-[#e5e7eb]" />
        <select
          value={priceFilter}
          onChange={e => setPriceFilter(e.target.value)}
          className="cursor-pointer border-none bg-transparent text-[14px] font-medium text-[#374151] outline-none"
        >
          <option value="">Any price</option>
          <option value="u15">Under $15k</option>
          <option value="15-25">$15k – $25k</option>
          <option value="25-40">$25k – $40k</option>
          <option value="o40">$40k+</option>
        </select>
        <button
          type="submit"
          className="shrink-0 rounded-[10px] bg-[#2563eb] px-7 py-3 text-[15px] font-bold text-white hover:bg-[#1d4ed8] transition-colors"
        >
          Search
        </button>
      </form>

      {/* Mobile search bar */}
      <form
        onSubmit={e => { e.preventDefault(); router.push(buildUrl({}, true)) }}
        className="mx-auto mb-8 flex sm:hidden w-full items-center gap-2 rounded-[14px] bg-white px-4 py-2.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_20px_40px_-8px_rgba(37,99,235,0.12),0_0_0_1px_rgba(0,0,0,0.06)]"
      >
        <Search size={16} className="shrink-0 text-[#9ca3af]" />
        <input
          ref={mobileInputRef}
          placeholder="Search make, model…"
          className="flex-1 min-w-0 bg-transparent text-[15px] text-[#111] outline-none placeholder:text-[#9ca3af]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-[8px] bg-[#2563eb] px-4 py-2 text-[14px] font-bold text-white hover:bg-[#1d4ed8] transition-colors"
        >
          Search
        </button>
      </form>

      {/* Filter pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {FILTER_PILLS.map(pill => (
          <button
            key={pill.label}
            onClick={() => handlePill(pill)}
            className={`rounded-full border px-4 py-[7px] text-[13px] font-medium transition-colors backdrop-blur-sm ${
              activeFilter === pill.label
                ? 'border-[#2563eb] bg-[#2563eb] text-white'
                : 'border-[#e2e8f0] bg-white/80 text-[#374151] hover:border-[#2563eb] hover:bg-[#2563eb] hover:text-white'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </div>
  )
}
