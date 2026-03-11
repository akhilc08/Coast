import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckCircle2, Clock } from 'lucide-react'

interface Props {
  searchParams: Promise<{ session_id?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams

  if (!session_id) {
    return <PendingState />
  }

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('*, listings(title, year, make, model, vin, price_cents)')
    .eq('stripe_checkout_session', session_id)
    .single()

  if (!order) {
    return <PendingState />
  }

  const listing = order.listings as {
    title: string | null
    year: number | null
    make: string | null
    model: string | null
    vin: string | null
    price_cents: number | null
  } | null

  const vehicleTitle =
    listing?.title ??
    [listing?.year, listing?.make, listing?.model].filter(Boolean).join(' ') ??
    'Vehicle'

  const orderNumber = (order.id as string).slice(0, 8).toUpperCase()

  const formattedPrice =
    order.price_cents != null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
          (order.price_cents as number) / 100
        )
      : null

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        {/* Success icon */}
        <div className="mb-6 flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>

        {/* Heading */}
        <h1 className="mb-2 text-3xl font-bold text-zinc-100">Order Confirmed</h1>
        <p className="text-zinc-400">
          Your payment was successful. Thank you for your purchase.
        </p>

        {/* Order details */}
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Order Number
              </span>
              <span className="font-mono text-sm font-semibold text-zinc-100">{orderNumber}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Vehicle
              </span>
              <span className="text-sm text-zinc-200">{vehicleTitle}</span>
            </div>

            {formattedPrice && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Amount Paid
                </span>
                <span className="text-lg font-semibold text-zinc-100">{formattedPrice}</span>
              </div>
            )}
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-left">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Documents are being prepared</p>
              <p className="mt-1 text-sm text-zinc-400">
                You&apos;ll receive an email when they&apos;re ready to sign. This usually takes a
                few minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            View Your Orders
          </Link>
          <Link
            href="/listings"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-6 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            Continue Browsing
          </Link>
        </div>
      </div>
    </main>
  )
}

function PendingState() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="mb-6 flex justify-center">
          <Clock className="h-16 w-16 text-zinc-400" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-zinc-100">Your order is being processed...</h1>
        <p className="text-zinc-400">
          This may take a few moments. You&apos;ll receive a confirmation email shortly.
        </p>
        <div className="mt-8">
          <Link
            href="/listings"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-6 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            Continue Browsing
          </Link>
        </div>
      </div>
    </main>
  )
}
