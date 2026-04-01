import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { GradeBadge } from '@/components/ui/GradeBadge'

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Pending Inspection', value: 'pending_inspection' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
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
    draft: 'border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]',
    active: 'border-green-200 bg-green-50 text-green-700',
    sold: 'border-amber-200 bg-amber-50 text-amber-700',
  }
  const cls = styles[status] ?? 'border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]'
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
      <h1 className="text-2xl font-bold text-[#1c1917]">Listings</h1>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-6 border-b border-[#e7e5e4]">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/listings?status=${tab.value}`}
              className={`pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-[#1d4ed8] text-[#1c1917]'
                  : 'text-[#78716c] hover:text-[#1c1917]'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#e7e5e4] bg-white">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[#a8a29e]">No listings found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e7e5e4] text-left bg-[#faf9f6]">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  VIN
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Seller
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Price
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Grade
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e5e4] text-sm">
              {rows.map((listing) => (
                <tr
                  key={listing.id}
                  className="cursor-pointer transition-colors hover:bg-[#faf9f6]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/listings/${listing.id}`}
                      className="block text-[#1c1917] font-medium hover:underline"
                    >
                      {listing.year} {listing.make} {listing.model}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#78716c]">{listing.vin}</td>
                  <td className="px-4 py-3 text-[#78716c]">
                    {listing.profiles?.company ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[#1c1917]">{formatPrice(listing.price_cents)}</td>
                  <td className="px-4 py-3">
                    <GradeBadge grade={listing.grade} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="px-4 py-3 text-[#78716c]">{formatDate(listing.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
