import { notFound } from 'next/navigation'
import { getListing } from '@/lib/queries/listings'
import { createClient } from '@/lib/supabase/server'
import { getSellerStats } from '@/lib/queries/reviews'
import { PhotoGallery } from '@/components/storefront/PhotoGallery'
import { GradeBadge } from '@/components/ui/GradeBadge'
import { SellerRatingBadge } from '@/components/reviews/SellerRatingBadge'
import Link from 'next/link'

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) notFound()

  // Get user for Buy CTA visibility check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check role — consumers can buy, wholesalers cannot
  const role = user?.app_metadata?.role
  const canBuy = !!user && role === 'consumer'
  const isSold = listing.status === 'sold'

  // Fetch seller rating stats (null if seller has no reviews — badge hides itself)
  const sellerStats = listing.seller_id
    ? await getSellerStats(listing.seller_id)
    : null

  // Construct photo URLs from storage keys (server-side, avoiding client hydration mismatch)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const photos = (listing.listing_photos ?? [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((p: { storage_key: string }) => ({
      storageKey: p.storage_key,
      url: `${supabaseUrl}/storage/v1/object/public/car-photos/${p.storage_key}`,
    }))

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Photo gallery — takes 3 of 5 columns on desktop */}
        <div className="lg:col-span-3">
          <PhotoGallery photos={photos} />
        </div>

        {/* Details panel — takes 2 of 5 columns on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and price */}
          <div>
            <h1 className="text-2xl font-bold text-[#1c1917]">
              {listing.year} {listing.make} {listing.model}
            </h1>
            <p className="mt-1 text-3xl font-semibold text-[#1c1917]">
              {listing.price_cents != null
                ? `$${(listing.price_cents / 100).toLocaleString()}`
                : 'Call for price'}
            </p>
            {/* Seller rating badge — shows "No reviews yet" if seller has none */}
            {listing.seller_id && (
              <div className="mt-2">
                <SellerRatingBadge stats={sellerStats} sellerId={listing.seller_id} />
              </div>
            )}
          </div>

          {/* Grade section — GRADE-02 placeholder */}
          <div className="rounded-lg border border-[#e7e5e4] bg-white p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#a8a29e]">Condition Grade</p>
            <GradeBadge grade={listing.grade} />
            {!listing.grade && (
              <p className="mt-2 text-xs text-[#a8a29e]">
                AI condition grade will appear here once analysis is complete.
              </p>
            )}
          </div>

          {/* Vehicle details */}
          <div className="rounded-lg border border-[#e7e5e4] bg-white p-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[#a8a29e]">Details</p>
            {[
              ['VIN', listing.vin],
              ['Mileage', listing.mileage != null ? `${listing.mileage.toLocaleString()} miles` : null],
              ['Color', listing.color],
              ['Trim', listing.trim],
              ['Body Style', listing.body_class],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-[#a8a29e]">{label}</span>
                <span className="text-[#1c1917]">{value}</span>
              </div>
            ))}
          </div>

          {/* Condition notes */}
          {listing.condition_notes && (
            <div className="rounded-lg border border-[#e7e5e4] bg-white p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#a8a29e]">Condition Notes</p>
              <p className="text-sm text-[#57534e] leading-relaxed">{listing.condition_notes}</p>
            </div>
          )}

          {/* Documents section — visible to all, links gated */}
          {listing.listing_documents && listing.listing_documents.length > 0 && (
            <div className="rounded-lg border border-[#e7e5e4] bg-white p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#a8a29e]">Documents</p>
              <ul className="space-y-2">
                {listing.listing_documents.map((doc: { id: string; file_name: string | null; document_type: string }) => (
                  <li key={doc.id} className="flex items-center gap-2 text-sm">
                    <span className="text-[#78716c]">{doc.file_name ?? doc.document_type}</span>
                    {user ? (
                      <span className="text-xs text-[#a8a29e]">(available after purchase)</span>
                    ) : (
                      <Link href="/login" className="text-xs text-blue-600 hover:text-blue-500">Log in to access</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Buy CTA — STOR-05 requirement: visible only to authenticated consumers */}
          {isSold ? (
            <div className="w-full rounded-xl border border-[#e7e5e4] bg-[#f5f5f4] py-3 text-center text-base font-semibold text-[#a8a29e]">
              Sold
            </div>
          ) : canBuy ? (
            <Link
              href={`/checkout/${listing.id}/transport`}
              className="block w-full rounded-xl bg-blue-600 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Buy Now — {listing.price_cents != null ? `$${(listing.price_cents / 100).toLocaleString('en-US')}` : '—'}
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
    </main>
  )
}
