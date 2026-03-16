import { notFound } from 'next/navigation'
import { getListing } from '@/lib/queries/listings'
import { createClient } from '@/lib/supabase/server'
import { getSellerStats } from '@/lib/queries/reviews'
import { PhotoGallery } from '@/components/storefront/PhotoGallery'
import { GradeBadge } from '@/components/ui/GradeBadge'
import { SellerRatingBadge } from '@/components/reviews/SellerRatingBadge'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role
  const canBuy = !!user && role === 'consumer'
  const isSold = listing.status === 'sold'

  const sellerStats = listing.seller_id
    ? await getSellerStats(listing.seller_id)
    : null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const photos = (listing.listing_photos ?? [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((p: { storage_key: string }) => ({
      storageKey: p.storage_key,
      url: `${supabaseUrl}/storage/v1/object/public/car-photos/${p.storage_key}`,
    }))

  // Build announcements from condition flags and known issues
  const announcements: { label: string; detail?: string }[] = []
  if (listing.has_accident_history) announcements.push({ label: 'Accident History', detail: 'Vehicle has a reported accident history' })
  if (listing.has_flood_damage)     announcements.push({ label: 'Flood Damage', detail: 'Vehicle has sustained flood damage' })
  if (listing.has_frame_damage)     announcements.push({ label: 'Frame Damage', detail: 'Vehicle has frame or structural damage' })
  if (listing.has_rebuilt_title)    announcements.push({ label: 'Rebuilt Title', detail: 'Vehicle carries a rebuilt or salvage title' })
  if (listing.has_lien)             announcements.push({ label: 'Lien Present', detail: 'An existing lien is attached to this vehicle' })
  if (listing.is_former_rental)     announcements.push({ label: 'Former Rental', detail: 'Vehicle was previously used as a rental vehicle' })
  if (listing.known_issues?.length) {
    listing.known_issues.forEach((issue: string) => announcements.push({ label: issue }))
  }

  const conditionColor = (v: string | null | undefined) => {
    switch (v) {
      case 'excellent': return 'text-green-600'
      case 'good':      return 'text-blue-600'
      case 'fair':      return 'text-yellow-600'
      case 'poor':      return 'text-red-600'
      default:          return 'text-[#78716c]'
    }
  }
  const conditionLabel = (v: string | null | undefined) =>
    v ? v.charAt(0).toUpperCase() + v.slice(1) : null

  const exteriorItems = [
    { label: 'Paint',  value: conditionLabel(listing.paint_condition),  color: conditionColor(listing.paint_condition) },
    { label: 'Body',   value: conditionLabel(listing.body_condition),   color: conditionColor(listing.body_condition) },
    { label: 'Glass',  value: conditionLabel(listing.glass_condition),  color: conditionColor(listing.glass_condition) },
  ].filter(i => i.value)

  const interiorItems = [
    { label: 'Seats',      value: conditionLabel(listing.seat_condition),      color: conditionColor(listing.seat_condition) },
    { label: 'Dashboard',  value: conditionLabel(listing.dashboard_condition), color: conditionColor(listing.dashboard_condition) },
    { label: 'Carpet',     value: conditionLabel(listing.carpet_condition),    color: conditionColor(listing.carpet_condition) },
  ].filter(i => i.value)

  const mechanicalItems = [
    { label: 'Engine',       value: conditionLabel(listing.engine_condition),       color: conditionColor(listing.engine_condition) },
    { label: 'Transmission', value: conditionLabel(listing.transmission_condition), color: conditionColor(listing.transmission_condition) },
    { label: 'Brakes',       value: conditionLabel(listing.brake_condition),        color: conditionColor(listing.brake_condition) },
    { label: 'Tires',        value: conditionLabel(listing.tire_condition),         color: conditionColor(listing.tire_condition) },
  ].filter(i => i.value)

  const hasConditionReport = exteriorItems.length > 0 || interiorItems.length > 0 || mechanicalItems.length > 0

  // Vehicle details for right-side table
  const vehicleDetails: [string, string | number][] = ([
    ['VIN',        listing.vin],
    ['Odometer',   listing.mileage != null ? `${listing.mileage.toLocaleString()} mi` : null],
    ['Year',       listing.year],
    ['Make',       listing.make],
    ['Model',      listing.model],
    ['Trim',       listing.trim],
    ['Body Style', listing.body_class],
    ['Color',      listing.color],
    ['Pickup ZIP', listing.pickup_zip],
  ] as [string, string | number | null][]).filter(([, v]) => v != null && v !== '') as [string, string | number][]

  const listingDate = listing.published_at ?? listing.created_at
  const formattedDate = listingDate
    ? new Date(listingDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : null

  const shortId = listing.id.replace(/-/g, '').slice(0, 8).toUpperCase()

  return (
    <main className="min-h-screen bg-[#f5f5f4]">

      {/* Top navigation bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#e7e5e4] px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-7xl flex items-center gap-6">
          <Link
            href="/listings"
            className="flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#1c1917] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-sm text-[#78716c] divide-x divide-[#e7e5e4]">
            <span className="pl-0">
              Listing: <span className="font-semibold text-[#1c1917]">#{shortId}</span>
            </span>
            {formattedDate && (
              <span className="pl-5">
                Listed: <span className="font-semibold text-[#1c1917]">{formattedDate}</span>
              </span>
            )}
            <span className="pl-5">{photos.length} Photos</span>
          </div>
        </div>
      </div>

      {/* Photo gallery — dark background like ACV */}
      <div className="bg-[#0d1117]">
        <div className="mx-auto max-w-7xl">
          <PhotoGallery photos={photos} />
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── LEFT COLUMN ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Vehicle identity card */}
            <div className="bg-white rounded-xl border border-[#e7e5e4] p-6">
              <h1 className="text-3xl font-bold text-[#1c1917]">
                {listing.year} {listing.make} {listing.model}
              </h1>
              {(listing.trim || listing.body_class) && (
                <p className="mt-1 text-sm text-[#78716c]">
                  {[listing.trim, listing.body_class].filter(Boolean).join(' • ')}
                </p>
              )}
              {listing.vin && (
                <p className="mt-3 font-mono text-sm text-[#1c1917] tracking-wide">
                  {listing.vin}
                </p>
              )}
              {listing.mileage != null && (
                <p className="mt-2 text-base font-medium text-[#1c1917]">
                  {listing.mileage.toLocaleString()} Miles
                </p>
              )}
              {listing.color && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#e7e5e4] bg-[#f5f5f4] px-3 py-1 text-xs font-medium text-[#78716c]">
                    {listing.color}
                  </span>
                </div>
              )}
              {listing.seller_id && (
                <div className="mt-4">
                  <SellerRatingBadge stats={sellerStats} sellerId={listing.seller_id} />
                </div>
              )}
            </div>

            {/* ANNOUNCEMENTS — yellow left border like ACV */}
            {(announcements.length > 0 || listing.overall_notes) && (
              <div className="bg-white rounded-xl border border-[#e7e5e4] overflow-hidden">
                <div className="border-l-4 border-yellow-400 px-6 py-5">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#1c1917]">
                    Announcements
                  </h2>
                  <div className="divide-y divide-[#f5f5f4]">
                    {listing.overall_notes && (
                      <div className="pb-3">
                        <p className="text-sm font-semibold text-[#1c1917]">General Notes</p>
                        <p className="mt-0.5 text-sm text-[#78716c]">{listing.overall_notes}</p>
                      </div>
                    )}
                    {announcements.map((item, i) => (
                      <div key={i} className="py-3 last:pb-0">
                        <p className="text-sm font-semibold text-[#1c1917]">{item.label}</p>
                        {item.detail && (
                          <p className="mt-0.5 text-sm text-[#78716c]">{item.detail}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Condition notes */}
            {listing.condition_notes && (
              <div className="bg-white rounded-xl border border-[#e7e5e4] p-6">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#1c1917]">
                  Condition Notes
                </h2>
                <p className="text-sm text-[#57534e] leading-relaxed">{listing.condition_notes}</p>
              </div>
            )}

            {/* Full Condition Report */}
            {hasConditionReport && (
              <div className="bg-white rounded-xl border border-[#e7e5e4] p-6">
                <h2 className="mb-5 text-xs font-bold uppercase tracking-wider text-[#1c1917]">
                  Full Condition Report
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {exteriorItems.length > 0 && (
                    <div className="rounded-lg border border-[#e7e5e4] p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
                        Exterior ({exteriorItems.length})
                      </p>
                      <div className="space-y-2.5">
                        {exteriorItems.map(item => (
                          <div key={item.label} className="flex justify-between text-sm border-b border-[#f5f5f4] pb-2 last:border-0 last:pb-0">
                            <span className="text-[#78716c]">{item.label}</span>
                            <span className={`font-medium ${item.color}`}>{item.value}</span>
                          </div>
                        ))}
                        {listing.exterior_notes && (
                          <p className="mt-1 text-xs text-[#a8a29e] leading-snug">{listing.exterior_notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {interiorItems.length > 0 && (
                    <div className="rounded-lg border border-[#e7e5e4] p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
                        Interior ({interiorItems.length})
                      </p>
                      <div className="space-y-2.5">
                        {interiorItems.map(item => (
                          <div key={item.label} className="flex justify-between text-sm border-b border-[#f5f5f4] pb-2 last:border-0 last:pb-0">
                            <span className="text-[#78716c]">{item.label}</span>
                            <span className={`font-medium ${item.color}`}>{item.value}</span>
                          </div>
                        ))}
                        {listing.interior_notes && (
                          <p className="mt-1 text-xs text-[#a8a29e] leading-snug">{listing.interior_notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {mechanicalItems.length > 0 && (
                    <div className="rounded-lg border border-[#e7e5e4] p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
                        Mechanicals ({mechanicalItems.length})
                      </p>
                      <div className="space-y-2.5">
                        {mechanicalItems.map(item => (
                          <div key={item.label} className="flex justify-between text-sm border-b border-[#f5f5f4] pb-2 last:border-0 last:pb-0">
                            <span className="text-[#78716c]">{item.label}</span>
                            <span className={`font-medium ${item.color}`}>{item.value}</span>
                          </div>
                        ))}
                        {listing.mechanical_notes && (
                          <p className="mt-1 text-xs text-[#a8a29e] leading-snug">{listing.mechanical_notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {listing.tire_tread_depth != null && (
                  <div className="mt-4 rounded-lg border border-[#e7e5e4] p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
                      Tire Tread Depth
                    </p>
                    <p className="text-sm font-medium text-[#1c1917]">{listing.tire_tread_depth}/32&quot;</p>
                  </div>
                )}
              </div>
            )}

            {/* Documents */}
            {listing.listing_documents && listing.listing_documents.length > 0 && (
              <div className="bg-white rounded-xl border border-[#e7e5e4] p-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#1c1917]">Documents</h2>
                <ul className="space-y-2">
                  {listing.listing_documents.map((doc: { id: string; file_name: string | null; document_type: string }) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border border-[#e7e5e4] px-4 py-3 text-sm"
                    >
                      <span className="text-[#1c1917] capitalize">
                        {doc.file_name ?? doc.document_type.replace(/_/g, ' ')}
                      </span>
                      {user ? (
                        <span className="text-xs text-[#a8a29e]">Available after purchase</span>
                      ) : (
                        <Link href="/login" className="text-xs text-blue-600 hover:text-blue-500">
                          Log in to access
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">

            {/* Price + Buy CTA */}
            <div className="bg-white rounded-xl border border-[#e7e5e4] p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-[#a8a29e] mb-1">
                Buy It Now
              </p>
              <p className="text-3xl font-bold text-[#1c1917]">
                {listing.price_cents != null
                  ? `$${(listing.price_cents / 100).toLocaleString()}`
                  : 'Call for price'}
              </p>
              <div className="mt-4">
                {isSold ? (
                  <div className="w-full rounded-xl border border-[#e7e5e4] bg-[#f5f5f4] py-3 text-center text-base font-semibold text-[#a8a29e]">
                    Sold
                  </div>
                ) : canBuy ? (
                  <Link
                    href={`/checkout/${listing.id}/transport`}
                    className="block w-full rounded-xl bg-blue-600 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-blue-500"
                  >
                    Buy Now —{' '}
                    {listing.price_cents != null
                      ? `$${(listing.price_cents / 100).toLocaleString('en-US')}`
                      : '—'}
                  </Link>
                ) : !user ? (
                  <Link
                    href="/login"
                    className="block w-full rounded-xl border border-[#e7e5e4] py-3 text-center text-sm text-[#78716c] transition-colors hover:border-[#a8a29e] hover:text-[#1c1917]"
                  >
                    Log in to purchase
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Condition Grade */}
            <div className="bg-white rounded-xl border border-[#e7e5e4] p-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#a8a29e]">
                Condition Grade
              </p>
              <GradeBadge grade={listing.grade} />
              {!listing.grade && (
                <p className="mt-2 text-xs text-[#a8a29e]">Grade pending analysis.</p>
              )}
            </div>

            {/* Vehicle Details table */}
            <div className="bg-white rounded-xl border border-[#e7e5e4] p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#1c1917]">
                Vehicle Details
              </h3>
              <div>
                {vehicleDetails.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between border-b border-[#f5f5f4] py-2.5 text-sm last:border-0"
                  >
                    <span className="text-[#a8a29e]">{label}</span>
                    <span className="font-medium text-[#1c1917] text-right max-w-[55%] break-all">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
