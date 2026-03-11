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
        className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 md:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom drawer */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-zinc-800 bg-zinc-950 p-5 transition-transform duration-300 md:hidden ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Filters</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-100">
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
