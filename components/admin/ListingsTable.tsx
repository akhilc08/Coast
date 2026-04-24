'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GradeBadge } from '@/components/ui/GradeBadge'
import { DeleteListingRowButton } from '@/components/admin/DeleteListingRowButton'
import { deleteBulkListingsAction } from '@/app/actions/admin'

interface Listing {
  id: string
  vin: string
  make: string
  model: string
  year: number
  price_cents: number
  status: string
  overall_grade: string | null
  created_at: string
  profiles: { company: string | null } | null
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:              'border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]',
    active:             'border-green-200 bg-green-50 text-green-700',
    sold:               'border-amber-200 bg-amber-50 text-amber-700',
    paused:             'border-orange-200 bg-orange-50 text-orange-700',
    pending_inspection: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? 'border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function ListingsTable({ rows }: { rows: Listing[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const allSelected = rows.length > 0 && selected.size === rows.length

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleBulkDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteBulkListingsAction(Array.from(selected))
      if ('error' in result) {
        setError(result.error)
        setConfirming(false)
      } else {
        setSelected(new Set())
        setConfirming(false)
        router.refresh()
      }
    })
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#e7e5e4] bg-white px-4 py-2.5">
          <span className="text-sm text-[#78716c]">
            {selected.size} listing{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <button
              type="button"
              onClick={() => { setSelected(new Set()); setConfirming(false) }}
              className="rounded-lg border border-[#e7e5e4] px-3 py-1.5 text-xs font-medium text-[#78716c] hover:bg-[#faf9f6] transition-colors"
            >
              Cancel
            </button>
            {confirming ? (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Deleting…' : `Confirm — delete ${selected.size}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                Delete selected
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#e7e5e4] bg-white">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[#a8a29e]">No listings found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e7e5e4] bg-[#faf9f6] text-left">
                <th className="pl-4 pr-2 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-[#e7e5e4] accent-[#1d4ed8]"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Vehicle</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">VIN</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Seller</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Price</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Grade</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Status</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e5e4] text-sm">
              {rows.map((listing) => (
                <tr
                  key={listing.id}
                  className={`transition-colors hover:bg-[#faf9f6] ${selected.has(listing.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="pl-4 pr-2 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(listing.id)}
                      onChange={() => toggleOne(listing.id)}
                      className="h-4 w-4 rounded border-[#e7e5e4] accent-[#1d4ed8]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/listings/${listing.id}`} className="font-medium text-[#1c1917] hover:underline">
                      {listing.year} {listing.make} {listing.model}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#78716c]">{listing.vin}</td>
                  <td className="px-4 py-3 text-[#78716c]">{listing.profiles?.company ?? '—'}</td>
                  <td className="px-4 py-3 text-[#1c1917]">{formatPrice(listing.price_cents)}</td>
                  <td className="px-4 py-3"><GradeBadge grade={listing.overall_grade} /></td>
                  <td className="px-4 py-3"><StatusBadge status={listing.status} /></td>
                  <td className="px-4 py-3 text-[#78716c]">{formatDate(listing.created_at)}</td>
                  <td className="px-4 py-3">
                    <DeleteListingRowButton listingId={listing.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
