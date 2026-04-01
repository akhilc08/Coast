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
      <div className="rounded-2xl border border-[#e7e5e4] bg-white p-8 text-center">
        {/* Success icon */}
        <div className="mb-6 flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>

        {/* Heading */}
        <h1 className="mb-2 text-3xl font-bold text-[#1c1917]">Order Confirmed</h1>
        <p className="text-[#78716c]">
          Your payment was successful. Thank you for your purchase.
        </p>

        {/* Order details */}
        <div className="mt-8 rounded-xl border border-[#e7e5e4] bg-[#faf9f6] p-6 text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e7e5e4] pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
                Order Number
              </span>
              <span className="font-mono text-sm font-semibold text-[#1c1917]">{orderNumber}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
                Vehicle
              </span>
              <span className="text-sm text-[#1c1917]">{vehicleTitle}</span>
            </div>

            {formattedPrice && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
                  Amount Paid
                </span>
                <span className="text-lg font-semibold text-[#1c1917]">{formattedPrice}</span>
              </div>
            )}
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-6 rounded-xl border border-[#e7e5e4] bg-[#faf9f6] p-6 text-left">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-[#1c1917]">Documents are being prepared</p>
              <p className="mt-1 text-sm text-[#78716c]">
                You&apos;ll receive an email when they&apos;re ready to sign. This usually takes a
                few minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Cancellation policy */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
          <p className="text-xs font-semibold text-amber-800">Seller Cancellation Policy</p>
          <p className="mt-1 text-xs text-amber-700">
            If the seller cancels after sale completion, a 10% penalty on the sale price applies: 5% goes to the buyer as credit, 5% is retained by Coast.
          </p>
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
            className="inline-flex items-center justify-center rounded-xl border border-[#e7e5e4] px-6 py-3 text-sm text-[#78716c] transition-colors hover:border-[#1c1917] hover:text-[#1c1917]"
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
      <div className="rounded-2xl border border-[#e7e5e4] bg-white p-8 text-center">
        <div className="mb-6 flex justify-center">
          <Clock className="h-16 w-16 text-[#a8a29e]" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-[#1c1917]">Your order is being processed...</h1>
        <p className="text-[#78716c]">
          This may take a few moments. You&apos;ll receive a confirmation email shortly.
        </p>
        <div className="mt-8">
          <Link
            href="/listings"
            className="inline-flex items-center justify-center rounded-xl border border-[#e7e5e4] px-6 py-3 text-sm text-[#78716c] transition-colors hover:border-[#1c1917] hover:text-[#1c1917]"
          >
            Continue Browsing
          </Link>
        </div>
      </div>
    </main>
  )
}
