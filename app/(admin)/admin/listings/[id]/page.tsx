import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminConditionUpload } from '@/components/admin/AdminConditionUpload'
import { AdminApproveButton } from '@/components/admin/AdminApproveButton'
import { ApproveListingButton } from '@/components/admin/ApproveListingButton'
import { AdminListingEditForm } from '@/components/admin/AdminListingEditForm'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100)
}

export default async function AdminListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('id, vin, make, model, year, price_cents, mileage, color, condition_notes, pickup_zip, status, grade, condition_locked, created_at, profiles!seller_id(full_name, company, email)')
    .eq('id', id)
    .single()

  if (!listing) notFound()

  const profile = (Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles) as { full_name: string | null; company: string | null; email: string | null; seller_tier: string | null } | null

  const canApprove = listing.status === 'pending_inspection' && !!listing.condition_locked

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
          &larr; Listings
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

      {/* Status banner for pending inspection */}
      {listing.status === 'pending_inspection' && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm font-semibold text-yellow-800">Pending Inspection</p>
          <p className="mt-0.5 text-xs text-yellow-600">
            This listing is awaiting inspection and approval before going live.
          </p>
        </div>
      )}

      {/* Listing info */}
      <div className="mt-6 rounded-lg border border-[#e7e5e4] bg-white p-6 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[#a8a29e]">Details</p>
        {[
          ['Seller', profile?.company ?? profile?.full_name ?? '—'],
          ['Email', profile?.email ?? '—'],
          ['Seller Tier', (profile?.seller_tier ?? 'beginner').charAt(0).toUpperCase() + (profile?.seller_tier ?? 'beginner').slice(1)],
          ['Price', formatPrice(listing.price_cents)],
          ['Status', statusLabel[listing.status] ?? listing.status],
          ['Grade', listing.grade ?? 'Not set'],
          ['Inspection Report', listing.condition_locked ? 'Locked' : 'Not uploaded'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-[#a8a29e]">{label}</span>
            <span className="text-[#1c1917] capitalize">{value}</span>
          </div>
        ))}
      </div>

      {/* Edit Listing */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Edit Listing</h2>
        <div className="rounded-lg border border-[#e7e5e4] bg-white p-6">
          <AdminListingEditForm
            listingId={listing.id}
            initialData={{
              make: listing.make,
              model: listing.model,
              year: listing.year,
              mileage: listing.mileage ?? null,
              price_cents: listing.price_cents,
              color: listing.color ?? null,
              condition_notes: listing.condition_notes ?? null,
              pickup_zip: listing.pickup_zip ?? null,
            }}
          />
        </div>
      </div>

      {/* Condition Report */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Condition Report</h2>
        <AdminConditionUpload listingId={listing.id} alreadyLocked={!!listing.condition_locked} />
      </div>

      {/* Approve button */}
      {listing.status === 'pending_inspection' && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Approval</h2>
          {canApprove ? (
            <ApproveListingButton listingId={listing.id} />
          ) : (
            <div className="rounded-lg border border-[#e7e5e4] bg-[#faf9f6] p-4">
              <p className="text-sm text-[#78716c]">
                Upload and lock the condition report before approving this listing.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
