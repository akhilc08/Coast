'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Pencil, Play, Trash2, Clock, CheckCircle, PauseCircle, FileText, ShoppingBag } from 'lucide-react'
import { unpauseListingAction } from '@/app/actions/listings'
import { ListingDeleteModal } from './ListingDeleteModal'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Photo {
  id: string
  storage_key: string
  position: number
}

interface Listing {
  id: string
  vin: string | null
  make: string | null
  model: string | null
  year: number | null
  price_cents: number | null
  status: string
  created_at: string
  listing_photos: Photo[]
}

interface DashboardListingsProps {
  active: Listing[]
  pendingInspection: Listing[]
  paused: Listing[]
  drafts: Listing[]
  sold: Listing[]
  supabaseUrl: string
}

function heroUrl(listing: Listing, supabaseUrl: string): string | null {
  const photos = listing.listing_photos ?? []
  const hero = photos.sort((a, b) => a.position - b.position)[0]
  if (!hero) return null
  return `${supabaseUrl}/storage/v1/object/public/car-photos/${hero.storage_key}`
}

function formatPrice(cents: number | null): string {
  if (!cents) return '—'
  return `$${(cents / 100).toLocaleString()}`
}

function listingAge(createdAt: string): string {
  const now = new Date()
  const created = new Date(createdAt)
  const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function vehicleLabel(l: Listing): string {
  if (l.year && l.make) return `${l.year} ${l.make} ${l.model ?? ''}`.trim()
  return l.vin ?? 'Draft listing'
}

function Thumbnail({ listing, supabaseUrl }: { listing: Listing; supabaseUrl: string }) {
  const url = heroUrl(listing, supabaseUrl)
  return (
    <div className="h-10 w-14 flex-shrink-0 overflow-hidden rounded bg-[#f5f4f0]">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[9px] text-[#a8a29e]">No photo</div>
      )}
    </div>
  )
}

function ListingRow({
  listing,
  supabaseUrl,
  actions,
}: {
  listing: Listing
  supabaseUrl: string
  actions: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#e7e5e4] bg-white px-3 py-2.5 hover:bg-[#faf9f6]">
      <Thumbnail listing={listing} supabaseUrl={supabaseUrl} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-[#1c1917] truncate">{vehicleLabel(listing)}</span>
          {listing.vin && (
            <span className="text-[10px] text-[#a8a29e] font-mono hidden sm:inline">{listing.vin}</span>
          )}
        </div>
        <div className="text-xs text-[#a8a29e] mt-0.5">
          {listingAge(listing.created_at)} · {formatPrice(listing.price_cents)}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {actions}
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  count,
  children,
  empty,
}: {
  title: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
  empty: string
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
          {title} ({count})
        </h2>
      </div>
      {count === 0 ? (
        <p className="text-sm text-[#a8a29e] pl-1">{empty}</p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </section>
  )
}

export function DashboardListings({
  active,
  pendingInspection,
  paused,
  drafts,
  sold,
  supabaseUrl,
}: DashboardListingsProps) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)

  async function handleUnpause(id: string) {
    const res = await unpauseListingAction(id)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success('Listing resumed')
    router.refresh()
  }

  return (
    <>
      {deleteTarget && (
        <ListingDeleteModal
          listingId={deleteTarget.id}
          vehicleLabel={deleteTarget.label}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <div className="space-y-8">
        {/* Active / Live */}
        <Section
          title="Live"
          icon={<CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
          count={active.length}
          empty="No live listings."
        >
          {active.map(l => (
            <ListingRow
              key={l.id}
              listing={l}
              supabaseUrl={supabaseUrl}
              actions={
                <>
                  <a
                    href={`/listings/${l.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View public listing"
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="hidden sm:inline">View</span>
                  </a>
                  <Link
                    href={`/seller/listings/${l.id}/edit`}
                    title="Edit listing"
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#78716c] hover:bg-[#f5f4f0] transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: l.id, label: vehicleLabel(l) })}
                    title="Remove listing"
                    className="flex items-center rounded px-2 py-1 text-xs text-[#a8a29e] hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              }
            />
          ))}
        </Section>

        {/* Pending Inspection */}
        <Section
          title="Pending Inspection"
          icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
          count={pendingInspection.length}
          empty="No listings awaiting inspection."
        >
          {pendingInspection.map(l => (
            <ListingRow
              key={l.id}
              listing={l}
              supabaseUrl={supabaseUrl}
              actions={
                <>
                  <Link
                    href={`/seller/listings/${l.id}/edit`}
                    title="Edit listing"
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#78716c] hover:bg-[#f5f4f0] transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: l.id, label: vehicleLabel(l) })}
                    title="Remove listing"
                    className="flex items-center rounded px-2 py-1 text-xs text-[#a8a29e] hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              }
            />
          ))}
        </Section>

        {/* Paused */}
        {paused.length > 0 && (
          <Section
            title="Paused"
            icon={<PauseCircle className="h-3.5 w-3.5 text-[#78716c]" />}
            count={paused.length}
            empty=""
          >
            {paused.map(l => (
              <ListingRow
                key={l.id}
                listing={l}
                supabaseUrl={supabaseUrl}
                actions={
                  <>
                    <button
                      onClick={() => handleUnpause(l.id)}
                      title="Resume listing"
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <Play className="h-3 w-3" />
                      <span className="hidden sm:inline">Resume</span>
                    </button>
                    <Link
                      href={`/seller/listings/${l.id}/edit`}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#78716c] hover:bg-[#f5f4f0] transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      <span className="hidden sm:inline">Edit</span>
                    </Link>
                    <button
                      onClick={() => setDeleteTarget({ id: l.id, label: vehicleLabel(l) })}
                      className="flex items-center rounded px-2 py-1 text-xs text-[#a8a29e] hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                }
              />
            ))}
          </Section>
        )}

        {/* Drafts */}
        <Section
          title="Drafts"
          icon={<FileText className="h-3.5 w-3.5 text-[#a8a29e]" />}
          count={drafts.length}
          empty="No draft listings."
        >
          {drafts.map(l => (
            <ListingRow
              key={l.id}
              listing={l}
              supabaseUrl={supabaseUrl}
              actions={
                <>
                  <Link
                    href={`/seller/listings/${l.id}/edit`}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    <span className="hidden sm:inline">Continue</span>
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: l.id, label: vehicleLabel(l) })}
                    className="flex items-center rounded px-2 py-1 text-xs text-[#a8a29e] hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              }
            />
          ))}
        </Section>

        {/* Sold / In Transit */}
        {sold.length > 0 && (
          <Section
            title="Sold / In Transit"
            icon={<ShoppingBag className="h-3.5 w-3.5 text-blue-500" />}
            count={sold.length}
            empty=""
          >
            {sold.map(l => (
              <ListingRow
                key={l.id}
                listing={l}
                supabaseUrl={supabaseUrl}
                actions={
                  <span className="text-xs text-[#a8a29e]">Sold</span>
                }
              />
            ))}
          </Section>
        )}
      </div>
    </>
  )
}
