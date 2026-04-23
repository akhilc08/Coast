'use client'

import { useState } from 'react'

const FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLSdDMHRwk81mOkjj7L5YVmrTaRcu6tDe20cy9dfjXMC4boRGVQ/viewform'

interface Listing {
  id: string
  year: number
  make: string
  model: string
  vin: string
  status: string
}

export function GoogleFormPicker({ listings }: { listings: Listing[] }) {
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState<Listing | null>(null)
  const [copied, setCopied]     = useState(false)

  const filtered = listings.filter(l => {
    const q = query.toLowerCase()
    return (
      `${l.year} ${l.make} ${l.model}`.toLowerCase().includes(q) ||
      l.vin.toLowerCase().includes(q)
    )
  })

  const formUrl = selected
    ? `${FORM_BASE}?usp=pp_url&entry.1357367560=${encodeURIComponent(selected.vin)}&entry.1870065493=${encodeURIComponent(selected.vin)}`
    : null

  async function handleCopy() {
    if (!formUrl) return
    await navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSelect(listing: Listing) {
    setSelected(listing)
    setQuery('')
    setCopied(false)
  }

  return (
    <div className="space-y-6">

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-[#1c1917] mb-2">
          Search by vehicle or VIN
        </label>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder="e.g. 2021 Toyota Camry or VIN…"
          className="w-full rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-4 py-3 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1d4ed8] focus:bg-white transition-colors"
        />
      </div>

      {/* Results list */}
      {query && !selected && (
        <div className="rounded-lg border border-[#e7e5e4] bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[#a8a29e]">No listings found.</p>
          ) : (
            <ul className="divide-y divide-[#e7e5e4] max-h-72 overflow-y-auto">
              {filtered.map(l => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(l)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#faf9f6] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1c1917]">
                        {l.year} {l.make} {l.model}
                      </p>
                      <p className="text-xs font-mono text-[#a8a29e] mt-0.5">{l.vin}</p>
                    </div>
                    <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${
                      l.status === 'active'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                    }`}>
                      {l.status === 'pending_inspection' ? 'Pending' : 'Active'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Selected vehicle + generated link */}
      {selected && formUrl && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800">
                {selected.year} {selected.make} {selected.model}
              </p>
              <p className="text-xs font-mono text-green-600 mt-0.5">{selected.vin}</p>
            </div>
            <button
              type="button"
              onClick={() => { setSelected(null); setQuery('') }}
              className="text-xs text-green-600 hover:text-green-800 underline"
            >
              Change
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-[#1c1917] mb-2">Pre-filled form link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-[#f5f4f0] px-3 py-2.5 text-xs text-[#78716c] truncate select-all">
                {formUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-lg border border-[#e7e5e4] bg-white px-3 py-2.5 text-xs font-medium text-[#1c1917] hover:bg-[#faf9f6] transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#1d4ed8] py-3 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
          >
            Open Form with VIN Pre-filled ↗
          </a>
        </div>
      )}

      {/* Empty state */}
      {!query && !selected && (
        <div className="rounded-xl border border-dashed border-[#e7e5e4] p-10 text-center">
          <p className="text-sm text-[#a8a29e]">Search for a vehicle above to generate its inspection form link.</p>
        </div>
      )}

    </div>
  )
}
