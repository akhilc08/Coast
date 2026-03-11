import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function formatUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()

  // Revenue: sum price_cents for revenue-generating statuses
  const { data: revenueRows } = await admin
    .from('orders')
    .select('price_cents')
    .in('status', ['paid', 'documents_sent', 'documents_signed', 'complete'])

  const totalRevenue = (revenueRows ?? []).reduce(
    (sum, row) => sum + (row.price_cents ?? 0),
    0
  )

  // Listings: total and active counts
  const { count: totalListings } = await admin
    .from('listings')
    .select('*', { count: 'exact', head: true })

  const { count: activeListings } = await admin
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Orders: total count
  const { count: totalOrders } = await admin
    .from('orders')
    .select('*', { count: 'exact', head: true })

  // Users: total and wholesaler count
  const { data: profileRows } = await admin
    .from('profiles')
    .select('role')

  const totalUsers = profileRows?.length ?? 0
  const wholesalerCount = (profileRows ?? []).filter(
    (p) => p.role === 'wholesaler'
  ).length

  // Recent orders (5 most recent)
  const { data: recentOrders } = await admin
    .from('orders')
    .select('id, price_cents, status, created_at, listings(make, model, year), profiles!buyer_id(email)')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="bg-zinc-950 min-h-full text-zinc-50">
      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm font-medium">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-50">
              {formatUSD(totalRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm font-medium">
              Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-50">
              {totalListings ?? 0}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              {activeListings ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm font-medium">
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-50">
              {totalOrders ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm font-medium">
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-50">{totalUsers}</p>
            <p className="text-sm text-zinc-400 mt-1">
              {wholesalerCount} sellers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-50 mb-4">
          Recent Orders
        </h2>
        <div className="space-y-2">
          {(recentOrders ?? []).length === 0 ? (
            <p className="text-zinc-500 text-sm">No orders yet.</p>
          ) : (
            (recentOrders ?? []).map((order) => {
              const listing = Array.isArray(order.listings)
                ? order.listings[0]
                : order.listings
              const vehicle = listing
                ? `${listing.year} ${listing.make} ${listing.model}`
                : 'Unknown vehicle'
              return (
                <Link
                  key={order.id}
                  href="/admin/orders"
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:bg-zinc-800 transition-colors"
                >
                  <span className="text-zinc-50 font-medium">{vehicle}</span>
                  <span className="flex items-center gap-4">
                    <span className="text-zinc-300">
                      {formatUSD(order.price_cents ?? 0)}
                    </span>
                    <span className="text-zinc-500 text-sm">
                      {relativeTime(order.created_at)}
                    </span>
                  </span>
                </Link>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
