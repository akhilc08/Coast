import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DownloadDocumentButton } from './DownloadDocumentButton'
import type { OrderStatus, DocumentStatus } from '@/lib/validations/order'

export const metadata = { title: 'Order Details — Coast' }

interface Props {
  params: Promise<{ orderId: string }>
}

// ─── Status helpers ──────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<OrderStatus, { label: string; className: string }> = {
    pending_payment: { label: 'Pending Payment', className: 'bg-[#f5f5f4] text-[#78716c]' },
    paid:             { label: 'Paid', className: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
    documents_sent:   { label: 'Documents Sent', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
    documents_signed: { label: 'Signed', className: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
    complete:         { label: 'Complete', className: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
    cancelled:        { label: 'Cancelled', className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
    refunded:         { label: 'Refunded', className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  }
  const { label, className } = config[status] ?? config.pending_payment
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config: Record<DocumentStatus, { label: string; className: string }> = {
    pending: { label: 'Being Prepared', className: 'bg-[#f5f5f4] text-[#78716c]' },
    sent:    { label: 'Awaiting Signature', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
    signed:  { label: 'Signed', className: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
    voided:  { label: 'Voided', className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  }
  const { label, className } = config[status] ?? config.pending
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function documentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    purchase_agreement: 'Purchase Agreement',
    title_transfer: 'Bill of Sale',
  }
  return labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderDocument = {
  id: string
  order_id: string
  document_type: string
  storage_key: string | null
  signed_at: string | null
  esign_ref: string | null
  status: DocumentStatus
}

type ListingRow = {
  id: string
  title: string | null
  year: number | null
  make: string | null
  model: string | null
  vin: string | null
  mileage: number | null
  exterior_color: string | null
  price_cents: number | null
}

type SellerProfile = {
  business_name: string | null
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
  order_documents: OrderDocument[]
  profiles: SellerProfile | null
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      listings(id, title, year, make, model, vin, mileage, exterior_color, price_cents),
      order_documents(*),
      profiles!orders_seller_id_fkey(business_name)
    `)
    .eq('id', orderId)
    .single()

  if (!order) redirect('/account/orders')

  const typedOrder = order as unknown as OrderRow

  const listing = typedOrder.listings
  const docs = typedOrder.order_documents ?? []
  const seller = typedOrder.profiles

  const vehicleLabel = listing
    ? [listing.year, listing.make, listing.model].filter(Boolean).join(' ')
    : 'Vehicle'

  const orderNumber = typedOrder.id.slice(0, 8).toUpperCase()

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(typedOrder.price_cents / 100)

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(typedOrder.created_at))

  const hasPendingSignature = docs.some((d) => d.status === 'sent')

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Back link */}
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
      >
        <span aria-hidden>&#8592;</span> My Orders
      </Link>

      {/* Order header */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Order</p>
          <h1 className="font-mono text-2xl font-bold text-[#1c1917]">#{orderNumber}</h1>
        </div>
        <OrderStatusBadge status={typedOrder.status} />
      </div>

      <div className="mt-8 space-y-4">

        {/* Vehicle section */}
        <section className="rounded-xl border border-[#e7e5e4] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Vehicle</p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#a8a29e]">Vehicle</span>
              <span className="font-medium text-[#1c1917]">{vehicleLabel || '—'}</span>
            </div>
            {listing?.vin && (
              <div className="flex justify-between text-sm">
                <span className="text-[#a8a29e]">VIN</span>
                <span className="font-mono text-[#57534e]">{listing.vin}</span>
              </div>
            )}
            {listing?.mileage != null && (
              <div className="flex justify-between text-sm">
                <span className="text-[#a8a29e]">Mileage</span>
                <span className="text-[#57534e]">
                  {new Intl.NumberFormat('en-US').format(listing.mileage)} mi
                </span>
              </div>
            )}
            {listing?.exterior_color && (
              <div className="flex justify-between text-sm">
                <span className="text-[#a8a29e]">Color</span>
                <span className="text-[#57534e]">{listing.exterior_color}</span>
              </div>
            )}
            {seller?.business_name && (
              <div className="flex justify-between text-sm">
                <span className="text-[#a8a29e]">Seller</span>
                <span className="text-[#57534e]">{seller.business_name}</span>
              </div>
            )}
          </div>
        </section>

        {/* Payment section */}
        <section className="rounded-xl border border-[#e7e5e4] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Payment</p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#a8a29e]">Amount Paid</span>
              <span className="text-lg font-semibold text-[#1c1917]">{formattedPrice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#a8a29e]">Date</span>
              <span className="text-[#57534e]">{formattedDate}</span>
            </div>
          </div>
        </section>

        {/* Documents section */}
        {docs.length > 0 && (
          <section className="rounded-xl border border-[#e7e5e4] bg-white p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Documents</p>
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-4 py-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#1c1917]">
                      {documentTypeLabel(doc.document_type)}
                    </span>
                    <DocumentStatusBadge status={doc.status} />
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.status === 'sent' && (
                      <span className="flex items-center gap-1.5 text-xs text-blue-600">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                        </span>
                        Awaiting your signature
                      </span>
                    )}
                    {doc.status === 'signed' && doc.storage_key && (
                      <DownloadDocumentButton documentId={doc.id} />
                    )}
                    {doc.status === 'pending' && (
                      <span className="text-xs text-[#a8a29e]">Being prepared&hellip;</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Signing notice */}
        {hasPendingSignature && (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <p className="mb-2 text-sm font-semibold text-blue-800">Documents ready to sign</p>
            <p className="text-sm text-blue-700">
              Your documents are ready for your signature. Check your email for the signing link,
              or it will appear here once the link is available.
            </p>
          </section>
        )}

      </div>
    </main>
  )
}
