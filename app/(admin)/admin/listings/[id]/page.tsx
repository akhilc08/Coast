import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminConditionUpload } from '@/components/admin/AdminConditionUpload'
import { AdminConditionForm } from '@/components/admin/AdminConditionForm'
import { AdminApproveButton } from '@/components/admin/AdminApproveButton'
import { ApproveListingButton } from '@/components/admin/ApproveListingButton'
import { AdminListingEditForm } from '@/components/admin/AdminListingEditForm'
import type { AiConditionData } from '@/lib/types/condition'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100)
}

export default async function AdminListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, vin, make, model, year, price_cents, mileage, color, condition_notes, pickup_zip, status, overall_grade, condition_locked, created_at, seller_id, ai_condition_exterior, ai_condition_interior, ai_condition_mechanical, ai_condition_tires, profiles!seller_id(full_name, company), listing_photos(id, storage_key, position, slot_type)')
    .eq('id', id)
    .single()

  if (listingError) throw new Error(`Failed to load listing: ${listingError.message}`)
  if (!listing) notFound()

  const profile = (Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles) as { full_name: string | null; company: string | null } | null

  // Fetch seller email + tier from auth/profiles (not in FK join)
  let sellerEmail: string | null = null
  let sellerTier: string | null = null
  if (listing.seller_id) {
    const [{ data: authUser }, { data: profileRow }] = await Promise.all([
      supabase.auth.admin.getUserById(listing.seller_id as string),
      supabase.from('profiles').select('seller_tier').eq('id', listing.seller_id as string).single(),
    ])
    sellerEmail = authUser?.user?.email ?? null
    sellerTier = (profileRow as { seller_tier?: string } | null)?.seller_tier ?? null
  }

  const canApprove = listing.status === 'pending_inspection'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const photos = ((listing as Record<string, unknown>).listing_photos as { id: string; storage_key: string; position: number; slot_type: string | null }[] ?? [])
    .filter(p => p.slot_type != null)
    .sort((a, b) => a.position - b.position)

  const aiCondition: AiConditionData | null = (listing as Record<string, unknown>).ai_condition_exterior
    ? {
        exterior:   (listing as Record<string, unknown>).ai_condition_exterior as AiConditionData['exterior'],
        interior:   (listing as Record<string, unknown>).ai_condition_interior as AiConditionData['interior'],
        mechanical: (listing as Record<string, unknown>).ai_condition_mechanical as AiConditionData['mechanical'],
        tires:      (listing as Record<string, unknown>).ai_condition_tires as AiConditionData['tires'],
      }
    : null

  const statusLabel: Record<string, string> = {
    draft: 'Draft',
    active: 'Live',
    pending_inspection: 'Pending Inspection',
    paused: 'Paused',
    sold: 'Sold',
    archived: 'Archived',
  }

  return (
    <div className="max-w-7xl">
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

      {/* Top row: edit + details side by side */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Edit Listing */}
        <div>
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

        {/* Listing info */}
        <div className="rounded-lg border border-[#e7e5e4] bg-white p-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[#a8a29e]">Details</p>
          {[
            ['Seller', profile?.company ?? profile?.full_name ?? '—'],
            ['Email', sellerEmail ?? '—'],
            ['Seller Tier', sellerTier ?? '—'],
            ['Price', formatPrice(listing.price_cents)],
            ['Status', statusLabel[listing.status] ?? listing.status],
            ['Grade', (listing as Record<string, unknown>).overall_grade as string ?? 'Not set'],
            ['Inspection Report', listing.condition_locked ? 'Locked' : 'Not uploaded'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm border-b border-[#f5f5f4] pb-3 last:border-0 last:pb-0">
              <span className="text-[#a8a29e]">{label}</span>
              <span className="text-[#1c1917] capitalize">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: left (upload + condition form) | right (photos) */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Left column: condition data form + approve */}
        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Condition Data</h2>
            <div className="rounded-lg border border-[#e7e5e4] bg-white p-6">
              <AdminConditionForm listingId={listing.id} initial={aiCondition} />
            </div>
          </div>

          {canApprove && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Approval</h2>
              <ApproveListingButton listingId={listing.id} />
            </div>
          )}
        </div>

        {/* Right column: inspection report upload + submitted photos */}
        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Inspection Report</h2>
            <AdminConditionUpload listingId={listing.id} alreadyLocked={!!listing.condition_locked} />
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">
              Submitted Photos
              <span className="ml-2 text-sm font-normal text-[#a8a29e]">({photos.length})</span>
            </h2>
            {photos.length === 0 ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center text-sm text-[#a8a29e]">
                No photos uploaded yet
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((photo, i) => (
                  <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[#e7e5e4] bg-[#f5f5f4]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/car-photos/${photo.storage_key}`}
                      alt={`Photo ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
