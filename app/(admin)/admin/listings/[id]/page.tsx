import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminConditionUpload } from '@/components/admin/AdminConditionUpload'
import { AdminApproveButton } from '@/components/admin/AdminApproveButton'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100)
}

export default async function AdminListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('id, vin, make, model, year, price_cents, status, grade, condition_locked, created_at, profiles!seller_id(full_name, company, email)')
    .eq('id', id)
    .single()

  if (!listing) notFound()

  const profile = (Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles) as { full_name: string | null; company: string | null; email: string | null } | null

  const statusLabel: Record<string, string> = {
    draft: 'Draft',
    active: 'Live',
    pending_inspection: 'Pending Inspection',
    paused: 'Paused',
    sold: 'Sold',
    archived: 'Archived',
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/listings" className="text-sm text-[#78716c] hover:text-[#1c1917]">
          ← Listings
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1917]">
            {listing.year} {listing.make} {listing.model}
          </h1>
          <p className="mt-1 font-mono text-sm text-[#78716c]">{listing.vin}</p>
        </div>

        {listing.status === 'pending_inspection' && (
          <AdminApproveButton listingId={listing.id} />
        )}
      </div>

      {/* Listing info */}
      <div className="mt-6 rounded-lg border border-[#e7e5e4] bg-white p-6 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[#a8a29e]">Details</p>
        {[
          ['Seller', profile?.company ?? profile?.full_name ?? '—'],
          ['Email', profile?.email ?? '—'],
          ['Price', formatPrice(listing.price_cents)],
          ['Status', statusLabel[listing.status] ?? listing.status],
          ['Grade', listing.grade ?? 'Not set'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-[#a8a29e]">{label}</span>
            <span className="text-[#1c1917] capitalize">{value}</span>
          </div>
        ))}
      </div>

      {/* Condition Report */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Condition Report</h2>
        <AdminConditionUpload listingId={listing.id} alreadyLocked={!!listing.condition_locked} />
      </div>
    </div>
  )
}
