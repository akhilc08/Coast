import { notFound } from 'next/navigation'
import { getListing } from '@/lib/queries/listings'
import { createClient } from '@/lib/supabase/server'
import { getSellerStats } from '@/lib/queries/reviews'
import { PhotoGallery } from '@/components/storefront/PhotoGallery'
import { GradeBadge } from '@/components/ui/GradeBadge'
import { SellerRatingBadge } from '@/components/reviews/SellerRatingBadge'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function conditionColor(v: string | null | undefined) {
  switch (v) {
    case 'excellent': return 'text-green-600'
    case 'good':      return 'text-blue-600'
    case 'fair':      return 'text-yellow-600'
    case 'poor':      return 'text-red-500'
    case 'salvage':   return 'text-red-700'
    default:          return 'text-[#78716c]'
  }
}

function conditionLabel(v: string | null | undefined) {
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : null
}

// A single row inside a condition card
function ConditionRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#f5f5f4] last:border-0">
      <span className="text-sm text-[#78716c]">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

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

  // ── Announcements ─────────────────────────────────────────────────────────
  const announcements: { label: string; detail?: string }[] = []
  if (listing.has_accident_history) announcements.push({ label: 'Accident History',  detail: 'Vehicle has a reported accident history' })
  if (listing.has_flood_damage)     announcements.push({ label: 'Flood Damage',      detail: 'Vehicle has sustained flood damage' })
  if (listing.has_frame_damage)     announcements.push({ label: 'Frame Damage',      detail: 'Vehicle has frame or structural damage' })
  if (listing.has_rebuilt_title)    announcements.push({ label: 'Rebuilt Title',     detail: 'Vehicle carries a rebuilt or salvage title' })
  if (listing.has_lien)             announcements.push({ label: 'Lien Present',      detail: 'An existing lien is attached to this vehicle' })
  if (listing.is_former_rental)     announcements.push({ label: 'Former Rental',     detail: 'Vehicle was previously used as a rental' })
  listing.known_issues?.forEach((issue: string) => announcements.push({ label: issue }))

  const hasAnnouncements = announcements.length > 0 || !!listing.overall_notes

  // ── Condition sub-sections ─────────────────────────────────────────────────
  const exteriorItems = [
    { label: 'Paint', value: conditionLabel(listing.paint_condition), color: conditionColor(listing.paint_condition) },
    { label: 'Body',  value: conditionLabel(listing.body_condition),  color: conditionColor(listing.body_condition) },
    { label: 'Glass', value: conditionLabel(listing.glass_condition), color: conditionColor(listing.glass_condition) },
  ].filter(i => i.value) as { label: string; value: string; color: string }[]

  const interiorItems = [
    { label: 'Seats',     value: conditionLabel(listing.seat_condition),      color: conditionColor(listing.seat_condition) },
    { label: 'Dashboard', value: conditionLabel(listing.dashboard_condition), color: conditionColor(listing.dashboard_condition) },
    { label: 'Carpet',    value: conditionLabel(listing.carpet_condition),    color: conditionColor(listing.carpet_condition) },
  ].filter(i => i.value) as { label: string; value: string; color: string }[]

  const mechanicalItems = [
    { label: 'Engine',       value: conditionLabel(listing.engine_condition),       color: conditionColor(listing.engine_condition) },
    { label: 'Transmission', value: conditionLabel(listing.transmission_condition), color: conditionColor(listing.transmission_condition) },
    { label: 'Brakes',       value: conditionLabel(listing.brake_condition),        color: conditionColor(listing.brake_condition) },
    { label: 'Tires',        value: conditionLabel(listing.tire_condition),         color: conditionColor(listing.tire_condition) },
  ].filter(i => i.value) as { label: string; value: string; color: string }[]

  const hasConditionReport = exteriorItems.length > 0 || interiorItems.length > 0 || mechanicalItems.length > 0

  // ── Vehicle details table ──────────────────────────────────────────────────
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
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#f5f5f4]">

      {/* ── Top nav bar ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#e7e5e4] shadow-sm">
        <div className="mx-auto max-w-7xl flex items-center gap-8 px-6 py-4">
          <Link
            href="/inventory"
            className="flex items-center gap-2 text-sm font-medium text-[#78716c] hover:text-[#1c1917] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </Link>

          <div className="hidden sm:flex items-center gap-0 text-sm text-[#78716c] divide-x divide-[#e7e5e4]">
            {formattedDate && (
              <span className="pr-6">
                Listed: <span className="font-semibold text-[#1c1917]">{formattedDate}</span>
              </span>
            )}
            <span className={formattedDate ? 'pl-6' : ''}>{photos.length} Photos</span>
          </div>
        </div>
      </div>

      {/* ── Photo gallery ─────────────────────────────────────────────────── */}
      <div className="bg-[#0d1117]">
        <div className="mx-auto max-w-7xl">
          <PhotoGallery photos={photos} />
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* ════════════════════════════════════════════════════════════════
              LEFT COLUMN
          ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2 space-y-6">

            {/* Vehicle identity */}
            <div className="bg-white rounded-2xl border border-[#e7e5e4] px-8 py-7">
              <h1 className="text-[2rem] font-bold leading-tight text-[#1c1917]">
                {listing.year} {listing.make} {listing.model}
              </h1>

              {(listing.trim || listing.body_class) && (
                <p className="mt-2 text-[15px] text-[#78716c]">
                  {[listing.trim, listing.body_class].filter(Boolean).join(' • ')}
                </p>
              )}

              {listing.vin && (
                <p className="mt-4 font-mono text-sm tracking-widest text-[#1c1917]">
                  {listing.vin}
                </p>
              )}

              {listing.mileage != null && (
                <p className="mt-3 text-xl font-semibold text-[#1c1917]">
                  {listing.mileage.toLocaleString()} Miles
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {listing.color && (
                  <span className="rounded-full border border-[#e7e5e4] bg-[#f5f5f4] px-4 py-1.5 text-sm font-medium text-[#57534e]">
                    {listing.color}
                  </span>
                )}
                {listing.overall_grade && (
                  <span className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                    listing.overall_grade === 'excellent' ? 'border-green-200 bg-green-50 text-green-700' :
                    listing.overall_grade === 'good'      ? 'border-blue-200 bg-blue-50 text-blue-700' :
                    listing.overall_grade === 'fair'      ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                    listing.overall_grade === 'poor'      ? 'border-red-200 bg-red-50 text-red-600' :
                    'border-red-300 bg-red-100 text-red-700'
                  }`}>
                    {conditionLabel(listing.overall_grade)} Condition
                  </span>
                )}
              </div>

              {listing.seller_id && (
                <div className="mt-5 pt-5 border-t border-[#f5f5f4]">
                  <SellerRatingBadge stats={sellerStats} sellerId={listing.seller_id} />
                </div>
              )}
            </div>

            {/* ANNOUNCEMENTS */}
            {hasAnnouncements && (
              <div className="rounded-2xl border border-[#e7e5e4] bg-white overflow-hidden">
                <div className="border-l-4 border-yellow-400 px-8 py-7">
                  <h2 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-[#1c1917]">
                    Announcements
                  </h2>
                  <div className="divide-y divide-[#f5f5f4]">
                    {listing.overall_notes && (
                      <div className="pb-5">
                        <p className="text-sm font-semibold text-[#1c1917]">General Notes</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-[#78716c]">{listing.overall_notes}</p>
                      </div>
                    )}
                    {announcements.map((item, i) => (
                      <div key={i} className="py-4 last:pb-0">
                        <p className="text-sm font-semibold text-[#1c1917]">{item.label}</p>
                        {item.detail && (
                          <p className="mt-1 text-sm text-[#78716c]">{item.detail}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Condition notes */}
            {listing.condition_notes && (
              <div className="rounded-2xl border border-[#e7e5e4] bg-white px-8 py-7">
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[#1c1917]">
                  Condition Notes
                </h2>
                <p className="text-sm leading-relaxed text-[#57534e]">{listing.condition_notes}</p>
              </div>
            )}

            {/* Full Condition Report */}
            {hasConditionReport && (
              <div className="rounded-2xl border border-[#e7e5e4] bg-white px-8 py-7">
                <h2 className="mb-6 text-[11px] font-bold uppercase tracking-widest text-[#1c1917]">
                  Full Condition Report
                </h2>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {/* Exterior */}
                  {exteriorItems.length > 0 && (
                    <div className="rounded-xl border border-[#e7e5e4] p-5">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#a8a29e]">
                        Exterior
                      </p>
                      <p className="mb-4 text-[11px] text-[#a8a29e]">{exteriorItems.length} items assessed</p>
                      {exteriorItems.map(item => (
                        <ConditionRow key={item.label} label={item.label} value={item.value} color={item.color} />
                      ))}
                      {listing.exterior_notes && (
                        <p className="mt-4 text-xs leading-relaxed text-[#a8a29e]">{listing.exterior_notes}</p>
                      )}
                    </div>
                  )}

                  {/* Interior */}
                  {interiorItems.length > 0 && (
                    <div className="rounded-xl border border-[#e7e5e4] p-5">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#a8a29e]">
                        Interior
                      </p>
                      <p className="mb-4 text-[11px] text-[#a8a29e]">{interiorItems.length} items assessed</p>
                      {interiorItems.map(item => (
                        <ConditionRow key={item.label} label={item.label} value={item.value} color={item.color} />
                      ))}
                      {listing.interior_notes && (
                        <p className="mt-4 text-xs leading-relaxed text-[#a8a29e]">{listing.interior_notes}</p>
                      )}
                    </div>
                  )}

                  {/* Mechanicals */}
                  {mechanicalItems.length > 0 && (
                    <div className="rounded-xl border border-[#e7e5e4] p-5">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#a8a29e]">
                        Mechanicals
                      </p>
                      <p className="mb-4 text-[11px] text-[#a8a29e]">{mechanicalItems.length} items assessed</p>
                      {mechanicalItems.map(item => (
                        <ConditionRow key={item.label} label={item.label} value={item.value} color={item.color} />
                      ))}
                      {listing.mechanical_notes && (
                        <p className="mt-4 text-xs leading-relaxed text-[#a8a29e]">{listing.mechanical_notes}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Tire tread depth */}
                {listing.tire_tread_depth != null && (
                  <div className="mt-5 flex items-center justify-between rounded-xl border border-[#e7e5e4] px-5 py-4">
                    <span className="text-sm font-medium text-[#78716c]">Tire Tread Depth</span>
                    <span className="text-sm font-bold text-[#1c1917]">
                      {listing.tire_tread_depth}/32&quot;
                      <span className="ml-2 text-xs font-normal text-[#a8a29e]">
                        {listing.tire_tread_depth >= 6 ? '(Good)' : listing.tire_tread_depth >= 4 ? '(Acceptable)' : '(Low)'}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Documents */}
            {listing.listing_documents && listing.listing_documents.length > 0 && (
              <div className="rounded-2xl border border-[#e7e5e4] bg-white px-8 py-7">
                <h2 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-[#1c1917]">
                  Documents
                </h2>
                <ul className="space-y-3">
                  {listing.listing_documents.map((doc: { id: string; file_name: string | null; document_type: string }) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between rounded-xl border border-[#e7e5e4] px-5 py-4"
                    >
                      <span className="text-sm font-medium text-[#1c1917] capitalize">
                        {doc.file_name ?? doc.document_type.replace(/_/g, ' ')}
                      </span>
                      {user ? (
                        <span className="text-xs text-[#a8a29e]">Available after purchase</span>
                      ) : (
                        <Link href="/login" className="text-xs text-blue-600 hover:text-blue-500 transition-colors">
                          Log in to access
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

          {/* ════════════════════════════════════════════════════════════════
              RIGHT COLUMN (sticky)
          ════════════════════════════════════════════════════════════════ */}
          <div className="space-y-5 lg:sticky lg:top-[73px] lg:self-start">

            {/* Price + Buy CTA */}
            <div className="rounded-2xl border border-[#e7e5e4] bg-white px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a8a29e]">
                Buy It Now
              </p>
              <p className="mt-2 text-4xl font-bold text-[#1c1917]">
                {listing.price_cents != null
                  ? `$${(listing.price_cents / 100).toLocaleString()}`
                  : 'Call for price'}
              </p>

              <div className="mt-5">
                {isSold ? (
                  <div className="w-full rounded-xl border border-[#e7e5e4] bg-[#f5f5f4] py-3.5 text-center text-base font-semibold text-[#a8a29e]">
                    Sold
                  </div>
                ) : canBuy ? (
                  <Link
                    href={`/checkout/${listing.id}/transport`}
                    className="block w-full rounded-xl bg-blue-600 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-blue-500"
                  >
                    Buy Now —{' '}
                    {listing.price_cents != null
                      ? `$${(listing.price_cents / 100).toLocaleString('en-US')}`
                      : '—'}
                  </Link>
                ) : !user ? (
                  <Link
                    href="/login"
                    className="block w-full rounded-xl border border-[#e7e5e4] py-3.5 text-center text-sm font-medium text-[#78716c] transition-colors hover:border-[#a8a29e] hover:text-[#1c1917]"
                  >
                    Log in to purchase
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Condition Grade (AI) */}
            <div className="rounded-2xl border border-[#e7e5e4] bg-white px-6 py-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#a8a29e]">
                Condition Grade
              </p>
              <GradeBadge grade={listing.grade} />
              {!listing.grade && (
                <p className="mt-2 text-xs text-[#a8a29e]">Grade pending analysis.</p>
              )}
            </div>

            {/* Vehicle Details */}
            <div className="rounded-2xl border border-[#e7e5e4] bg-white px-6 py-6">
              <h3 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-[#1c1917]">
                Vehicle Details
              </h3>
              <div>
                {vehicleDetails.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between border-b border-[#f5f5f4] py-3 text-sm last:border-0 last:pb-0"
                  >
                    <span className="text-[#a8a29e] shrink-0 mr-4">{label}</span>
                    <span className="font-semibold text-[#1c1917] text-right break-all">
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
