import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Signing', value: 'signing' },
  { label: 'Complete', value: 'complete' },
]

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending',
  paid: 'Paid',
  documents_sent: 'Signing',
  documents_signed: 'Signed',
  complete: 'Complete',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'border-zinc-700 bg-zinc-800 text-zinc-400',
  paid: 'border-blue-800 bg-blue-950 text-blue-400',
  documents_sent: 'border-amber-800 bg-amber-950 text-amber-400',
  documents_signed: 'border-green-800 bg-green-950 text-green-400',
  complete: 'border-green-800 bg-green-950 text-green-400',
  cancelled: 'border-red-800 bg-red-950 text-red-400',
  refunded: 'border-red-800 bg-red-950 text-red-400',
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

interface Order {
  id: string
  price_cents: number
  status: string
  created_at: string
  listings: { make: string; model: string; year: number } | null
  profiles: { email: string | null } | null
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
    .select('id, price_cents, status, created_at, listings!inner(make, model, year), profiles!buyer_id(email)')
    .order('created_at', { ascending: false })

  if (status === 'paid') {
    query = query.eq('status', 'paid')
  } else if (status === 'signing') {
    query = query.eq('status', 'documents_sent')
  } else if (status === 'complete') {
    query = query.in('status', ['documents_signed', 'complete'])
  }

  const { data: orders, error } = await query

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`)
  }

  const rows = (orders ?? []) as unknown as Order[]

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-50">Orders</h1>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-6 border-b border-zinc-800">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/orders?status=${tab.value}`}
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
          <p className="px-6 py-8 text-center text-sm text-zinc-500">No orders found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Order #
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Buyer
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Amount
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {rows.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-zinc-50">
                    {order.listings
                      ? `${order.listings.year} ${order.listings.make} ${order.listings.model}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{order.profiles?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatPrice(order.price_cents)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
