'use client'

import { useState } from 'react'
import { StorefrontFilters } from './StorefrontFilters'
import { SlidersHorizontal, X } from 'lucide-react'

export function FilterDrawer({ makes }: { makes: string[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger button — only visible on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-[#e7e5e4] px-3 py-2 text-sm text-[#44403c] hover:border-[#1c1917] md:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom drawer */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-[#e7e5e4] bg-white p-5 transition-transform duration-300 md:hidden ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1c1917]">Filters</h2>
          <button onClick={() => setOpen(false)} className="text-[#78716c] hover:text-[#1c1917]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pb-8">
          <StorefrontFilters makes={makes} />
        </div>
      </div>
    </>
  )
}
