import { notFound } from 'next/navigation'
import { getListing } from '@/lib/queries/listings'
import { createClient } from '@/lib/supabase/server'
import { PhotoGallery } from '@/components/storefront/PhotoGallery'
import { GradeBadge } from '@/components/ui/GradeBadge'
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
            <h1 className="text-2xl font-bold text-zinc-100">
              {listing.year} {listing.make} {listing.model}
            </h1>
            <p className="mt-1 text-3xl font-semibold text-zinc-100">
              {listing.price_cents != null
                ? `$${(listing.price_cents / 100).toLocaleString()}`
                : 'Call for price'}
            </p>
          </div>

          {/* Grade section — GRADE-02 placeholder */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Condition Grade</p>
            <GradeBadge grade={listing.grade} />
            {!listing.grade && (
              <p className="mt-2 text-xs text-zinc-600">
                AI condition grade will appear here once analysis is complete.
              </p>
            )}
          </div>

          {/* Vehicle details */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Details</p>
            {[
              ['VIN', listing.vin],
              ['Mileage', listing.mileage != null ? `${listing.mileage.toLocaleString()} miles` : null],
              ['Color', listing.color],
              ['Trim', listing.trim],
              ['Body Style', listing.body_class],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-zinc-500">{label}</span>
                <span className="text-zinc-200">{value}</span>
              </div>
            ))}
          </div>

          {/* Condition notes */}
          {listing.condition_notes && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Condition Notes</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{listing.condition_notes}</p>
            </div>
          )}

          {/* Documents section — visible to all, links gated */}
          {listing.listing_documents && listing.listing_documents.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Documents</p>
              <ul className="space-y-2">
                {listing.listing_documents.map((doc: { id: string; original_name: string | null; document_type: string }) => (
                  <li key={doc.id} className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400">{doc.original_name ?? doc.document_type}</span>
                    {user ? (
                      <span className="text-xs text-zinc-600">(available after purchase)</span>
                    ) : (
                      <Link href="/login" className="text-xs text-blue-400 hover:text-blue-300">Log in to access</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Buy CTA — STOR-05 requirement: visible only to authenticated consumers */}
          {canBuy && (
            <button
              className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-500"
              disabled
              title="Purchase flow coming in Phase 3"
            >
              Buy Now — ${listing.price_cents != null ? (listing.price_cents / 100).toLocaleString() : '—'}
            </button>
          )}

          {!user && (
            <Link
              href="/login"
              className="block w-full rounded-xl border border-zinc-700 py-3 text-center text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
            >
              Log in to purchase
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
