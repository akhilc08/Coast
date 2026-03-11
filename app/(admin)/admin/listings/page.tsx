import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { GradeBadge } from '@/components/ui/GradeBadge'

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Sold', value: 'sold' },
]

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'border-zinc-700 bg-zinc-800 text-zinc-400',
    active: 'border-green-800 bg-green-950 text-green-400',
    sold: 'border-amber-800 bg-amber-950 text-amber-400',
  }
  const cls = styles[status] ?? 'border-zinc-700 bg-zinc-800 text-zinc-400'
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  )
}

interface Listing {
  id: string
  vin: string
  make: string
  model: string
  year: number
  price_cents: number
  status: string
  grade: string | null
  created_at: string
  profiles: { company: string | null } | null
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const status = params.status ?? 'all'

  const supabase = createAdminClient()
  let query = supabase
    .from('listings')
    .select('id, vin, make, model, year, price_cents, status, grade, created_at, profiles!seller_id(company)')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: listings, error } = await query

  if (error) {
    throw new Error(`Failed to fetch listings: ${error.message}`)
  }

  const rows = (listings ?? []) as unknown as Listing[]

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-50">Listings</h1>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-6 border-b border-zinc-800">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/listings?status=${tab.value}`}
              className={`pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-blue-500 text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">No listings found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  VIN
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Seller
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Price
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Grade
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {rows.map((listing) => (
                <tr
                  key={listing.id}
                  className="cursor-pointer transition-colors hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/listings/${listing.id}`}
                      className="block text-zinc-50 hover:underline"
                    >
                      {listing.year} {listing.make} {listing.model}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{listing.vin}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {listing.profiles?.company ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{formatPrice(listing.price_cents)}</td>
                  <td className="px-4 py-3">
                    <GradeBadge grade={listing.grade} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(listing.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
