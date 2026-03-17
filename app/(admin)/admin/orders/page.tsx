import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Signed', value: 'signed' },
  { label: 'Delivered', value: 'delivered' },
]

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending',
  paid: 'Paid',
  documents_sent: 'Signing',
  documents_signed: 'Signed',
  complete: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]',
  paid: 'border-blue-200 bg-blue-50 text-blue-700',
  documents_sent: 'border-amber-200 bg-amber-50 text-amber-700',
  documents_signed: 'border-amber-200 bg-amber-50 text-amber-700',
  complete: 'border-green-200 bg-green-50 text-green-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
  refunded: 'border-red-200 bg-red-50 text-red-700',
}

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

function OrderStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const cls = STATUS_STYLES[status] ?? 'border-zinc-700 bg-zinc-800 text-zinc-400'
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  )
}

interface OrderRow {
  id: string
  buyer_id: string
  price_cents: number
  status: string
  created_at: string
  listings: { make: string; model: string; year: number } | { make: string; model: string; year: number }[] | null
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const status = params.status ?? 'all'

  const supabase = createAdminClient()
  let query = supabase
    .from('orders')
    .select('id, buyer_id, price_cents, status, created_at, listings(make, model, year)')
    .order('created_at', { ascending: false })

  if (status === 'paid') {
    query = query.eq('status', 'paid')
  } else if (status === 'signed') {
    query = query.eq('status', 'documents_signed')
  } else if (status === 'delivered') {
    query = query.eq('status', 'complete')
  }

  const { data: orders, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#1c1917]">Orders</h1>
        <p className="mt-4 text-sm text-red-600">Failed to load orders: {error.message}</p>
      </div>
    )
  }

  const rows = (orders ?? []) as unknown as OrderRow[]

  // Fetch buyer emails from auth.users
  const buyerEmailMap: Record<string, string> = {}
  if (rows.length > 0) {
    const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    for (const user of usersData?.users ?? []) {
      if (user.email) buyerEmailMap[user.id] = user.email
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1c1917]">Orders</h1>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-6 border-b border-[#e7e5e4]">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/orders?status=${tab.value}`}
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
          <p className="px-6 py-8 text-center text-sm text-[#a8a29e]">No orders found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e7e5e4] text-left bg-[#faf9f6]">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Order #
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Buyer
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Amount
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e5e4] text-sm">
              {rows.map((order) => {
                const listing = Array.isArray(order.listings) ? order.listings[0] : order.listings
                return (
                  <tr key={order.id} className="transition-colors hover:bg-[#faf9f6]">
                    <td className="px-4 py-3 font-mono text-xs text-[#78716c]">
                      {order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1c1917]">
                      {listing
                        ? `${listing.year} ${listing.make} ${listing.model}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#78716c]">
                      {buyerEmailMap[order.buyer_id] ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[#1c1917]">{formatPrice(order.price_cents)}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-[#78716c]">{formatDate(order.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
