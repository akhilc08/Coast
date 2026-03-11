import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import type { OrderStatus } from '@/lib/validations/order'

export const metadata = { title: 'My Orders — Coast' }

function StatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<OrderStatus, { label: string; className: string }> = {
    pending_payment: { label: 'Pending', className: 'bg-[#f5f5f4] text-[#78716c]' },
    paid:             { label: 'Paid', className: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
    documents_sent:   { label: 'Documents Sent', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
    documents_signed: { label: 'Signed', className: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
    complete:         { label: 'Complete', className: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
    cancelled:        { label: 'Cancelled', className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
    refunded:         { label: 'Refunded', className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
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
      <h1 className="text-2xl font-bold text-[#1c1917]">My Orders</h1>

      {typedOrders.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-[#78716c]">You haven&apos;t made any purchases yet.</p>
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
                <Card className="bg-white border-[#e7e5e4] transition-all hover:border-[#a8a29e] hover:shadow-sm">
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
                    <div className="h-44 w-full rounded-t-xl bg-[#f5f5f4] flex items-center justify-center">
                      <span className="text-sm text-[#a8a29e]">No photo</span>
                    </div>
                  )}
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#1c1917]">{vehicleLabel}</p>
                        {listing?.vin && (
                          <p className="mt-0.5 text-xs text-[#a8a29e]">VIN: {listing.vin}</p>
                        )}
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t border-[#e7e5e4] bg-transparent">
                    <span className="text-lg font-semibold text-[#1c1917]">{formattedPrice}</span>
                    <span className="text-xs text-[#a8a29e]">{formattedDate}</span>
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
