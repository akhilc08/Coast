import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import type { OrderStatus } from '@/lib/validations/order'

export const metadata = { title: 'My Orders — Coast' }

function StatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<OrderStatus, { label: string; className: string }> = {
    pending_payment: { label: 'Pending', className: 'bg-zinc-700 text-zinc-300' },
    paid:             { label: 'Paid', className: 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/30' },
    documents_sent:   { label: 'Documents Sent', className: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30' },
    documents_signed: { label: 'Signed', className: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' },
    complete:         { label: 'Complete', className: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' },
    cancelled:        { label: 'Cancelled', className: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30' },
    refunded:         { label: 'Refunded', className: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30' },
  }

  const { label, className } = config[status] ?? config.pending_payment

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

type ListingPhoto = { storage_key: string }
type ListingRow = {
  id: string
  title: string | null
  year: number | null
  make: string | null
  model: string | null
  vin: string | null
  price_cents: number | null
  photos: ListingPhoto[]
}
type OrderRow = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  status: OrderStatus
  price_cents: number
  created_at: string
  listings: ListingRow | null
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, listings(id, title, year, make, model, vin, price_cents, photos:listing_photos(storage_key))')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  const typedOrders = (orders ?? []) as unknown as OrderRow[]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-100">My Orders</h1>

      {typedOrders.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-zinc-400">You haven&apos;t made any purchases yet.</p>
          <Link
            href="/inventory"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Browse Listings
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {typedOrders.map((order) => {
            const listing = order.listings
            const vehicleLabel = listing
              ? [listing.year, listing.make, listing.model].filter(Boolean).join(' ')
              : 'Vehicle'

            const formattedPrice = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(order.price_cents / 100)

            const formattedDate = new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date(order.created_at))

            const firstPhoto = listing?.photos?.[0]
            const photoUrl = firstPhoto
              ? `${supabaseUrl}/storage/v1/object/public/car-photos/${firstPhoto.storage_key}`
              : null

            return (
              <Link key={order.id} href={`/account/orders/${order.id}`} className="block group">
                <Card className="bg-zinc-900 border-zinc-800 transition-all hover:border-zinc-600 hover:bg-zinc-800/80">
                  {photoUrl ? (
                    <div className="relative h-44 w-full overflow-hidden rounded-t-xl">
                      <Image
                        src={photoUrl}
                        alt={vehicleLabel}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    </div>
                  ) : (
                    <div className="h-44 w-full rounded-t-xl bg-zinc-800 flex items-center justify-center">
                      <span className="text-sm text-zinc-500">No photo</span>
                    </div>
                  )}
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-zinc-100">{vehicleLabel}</p>
                        {listing?.vin && (
                          <p className="mt-0.5 text-xs text-zinc-500">VIN: {listing.vin}</p>
                        )}
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t border-zinc-800 bg-transparent">
                    <span className="text-lg font-semibold text-zinc-100">{formattedPrice}</span>
                    <span className="text-xs text-zinc-500">{formattedDate}</span>
                  </CardFooter>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
