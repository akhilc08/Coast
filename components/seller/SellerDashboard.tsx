'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Car, ExternalLink, Pause, Play, Trash2, X } from 'lucide-react'
import {
  pauseListingAction,
  unpauseListingAction,
  deleteListingAction,
  archiveListingAction,
} from '@/app/actions/listings'
import { toast } from 'sonner'

type ListingStatus = 'active' | 'draft' | 'paused' | 'pending_inspection' | 'sold' | 'archived'

interface DashboardListing {
  id: string
  vin: string | null
  make: string | null
  model: string | null
  year: number | null
  price_cents: number | null
  status: ListingStatus
  created_at: string
  hero_url: string | null
}

interface SoldListing extends DashboardListing {
  sale_price_cents: number | null
  sale_date: string | null
  transport_status: string | null
}

type Tab = 'published' | 'pending' | 'paused' | 'sold' | 'drafts'

const TABS: { value: Tab; label: string }[] = [
  { value: 'published', label: 'Published' },
  { value: 'pending', label: 'Pending Inspection' },
  { value: 'paused', label: 'Paused' },
  { value: 'sold', label: 'Sold / In Transit' },
  { value: 'drafts', label: 'Drafts' },
]

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays > 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (diffDays >= 1) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffHours >= 1) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffMins >= 1) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  return 'Just now'
}

function VehicleName({ listing }: { listing: DashboardListing }) {
  const name = listing.year && listing.make
    ? `${listing.year} ${listing.make} ${listing.model}`
    : 'Draft listing'

  if (listing.status === 'active') {
    return (
      <a
        href={`/listings/${listing.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-[#1c1917] hover:text-blue-600 transition-colors"
      >
        {name}
        <ExternalLink className="h-3 w-3 text-[#a8a29e]" />
      </a>
    )
  }

  return <span className="font-medium text-[#1c1917]">{name}</span>
}

function Thumbnail({ listing }: { listing: DashboardListing }) {
  if (listing.hero_url) {
    return (
      <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-[#f5f5f4]">
        <Image
          src={listing.hero_url}
          alt=""
          fill
          className="object-cover"
          sizes="56px"
        />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-[#f5f5f4]">
      <Car className="h-4 w-4 text-[#a8a29e]" />
    </div>
  )
}

function StatusBadge({ status }: { status: ListingStatus }) {
  const styles: Record<string, string> = {
    active: 'border-green-200 bg-green-50 text-green-700',
    draft: 'border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]',
    paused: 'border-orange-200 bg-orange-50 text-orange-700',
    pending_inspection: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    sold: 'border-blue-200 bg-blue-50 text-blue-700',
    archived: 'border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]',
  }
  const labels: Record<string, string> = {
    active: 'Active',
    draft: 'Draft',
    paused: 'Paused',
    pending_inspection: 'Pending Inspection',
    sold: 'Sold',
    archived: 'Archived',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}>
      {labels[status] ?? status}
    </span>
  )
}

function DeleteModal({
  listing,
  onClose,
}: {
  listing: DashboardListing
  onClose: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [pausing, setPausing] = useState(false)

  const name = listing.year && listing.make
    ? `${listing.year} ${listing.make} ${listing.model}`
    : 'this listing'

  async function handlePause() {
    setPausing(true)
    const result = await pauseListingAction(listing.id)
    if ('error' in result) {
      toast.error(result.error)
      setPausing(false)
      return
    }
    toast.success('Listing paused')
    onClose()
    window.location.reload()
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteListingAction(listing.id)
    if ('error' in result) {
      toast.error(result.error)
      setDeleting(false)
      return
    }
    toast.success('Listing deleted')
    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-2xl border border-[#e7e5e4] bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#1c1917]">Remove Listing</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-[#f5f5f4]">
            <X className="h-4 w-4 text-[#78716c]" />
          </button>
        </div>

        <p className="mb-6 text-sm text-[#78716c]">
          What would you like to do with <strong>{name}</strong>?
        </p>

        <div className="space-y-3">
          <button
            onClick={handlePause}
            disabled={pausing || listing.status === 'paused'}
            className="flex w-full items-center gap-3 rounded-xl border border-[#e7e5e4] px-4 py-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50 disabled:opacity-50"
          >
            <Pause className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-[#1c1917]">Pause temporarily</p>
              <p className="text-xs text-[#78716c]">Hidden from buyers, resume anytime</p>
            </div>
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full items-center gap-3 rounded-xl border border-red-200 px-4 py-3 text-left transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700">Delete permanently</p>
              <p className="text-xs text-red-500">Car will need to be re-inspected if relisted</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

function ListingRow({
  listing,
  showPrice,
  showSaleInfo,
}: {
  listing: DashboardListing | SoldListing
  showPrice?: boolean
  showSaleInfo?: boolean
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  async function handlePause() {
    setActionLoading(true)
    const result = await pauseListingAction(listing.id)
    if ('error' in result) toast.error(result.error)
    else toast.success('Listing paused')
    setActionLoading(false)
    window.location.reload()
  }

  async function handleResume() {
    setActionLoading(true)
    const result = await unpauseListingAction(listing.id)
    if ('error' in result) toast.error(result.error)
    else toast.success('Listing resumed')
    setActionLoading(false)
    window.location.reload()
  }

  async function handleArchive() {
    setActionLoading(true)
    const result = await archiveListingAction(listing.id)
    if ('error' in result) toast.error(result.error)
    else toast.success('Listing archived')
    setActionLoading(false)
    window.location.reload()
  }

  const soldListing = listing as SoldListing

  return (
    <>
      <tr className="bg-white hover:bg-[#faf9f6]">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Thumbnail listing={listing} />
            <div>
              <VehicleName listing={listing} />
              {listing.vin && <p className="text-xs text-[#a8a29e]">{listing.vin}</p>}
            </div>
          </div>
        </td>
        {showPrice && (
          <td className="px-4 py-3 text-[#78716c]">
            {listing.price_cents ? `$${(listing.price_cents / 100).toLocaleString()}` : '—'}
          </td>
        )}
        {showSaleInfo && (
          <>
            <td className="px-4 py-3 text-[#78716c]">
              {soldListing.sale_price_cents ? `$${(soldListing.sale_price_cents / 100).toLocaleString()}` : '—'}
            </td>
            <td className="px-4 py-3 text-[#78716c]">Buyer</td>
            <td className="px-4 py-3 text-[#78716c]">
              {soldListing.sale_date ? formatRelativeTime(soldListing.sale_date) : '—'}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={soldListing.transport_status === 'not_requested' ? 'sold' : 'sold'} />
            </td>
          </>
        )}
        <td className="px-4 py-3 text-xs text-[#a8a29e]">
          {formatRelativeTime(listing.created_at)}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {listing.status === 'active' && (
              <>
                <Link href={`/seller/listings/${listing.id}/edit`} className="text-blue-600 hover:text-blue-500 text-xs">Edit</Link>
                <button onClick={handlePause} disabled={actionLoading} className="text-orange-600 hover:text-orange-500 text-xs disabled:opacity-50">
                  <Pause className="inline h-3 w-3 mr-0.5" />Pause
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="text-red-500 hover:text-red-400 text-xs">
                  <Trash2 className="inline h-3 w-3 mr-0.5" />Delete
                </button>
              </>
            )}
            {listing.status === 'paused' && (
              <>
                <button onClick={handleResume} disabled={actionLoading} className="text-emerald-600 hover:text-emerald-500 text-xs disabled:opacity-50">
                  <Play className="inline h-3 w-3 mr-0.5" />Resume
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="text-red-500 hover:text-red-400 text-xs">
                  <Trash2 className="inline h-3 w-3 mr-0.5" />Delete
                </button>
              </>
            )}
            {listing.status === 'pending_inspection' && (
              <>
                <StatusBadge status="pending_inspection" />
              </>
            )}
            {listing.status === 'draft' && (
              <>
                <Link href={`/seller/listings/${listing.id}/edit`} className="text-blue-600 hover:text-blue-500 text-xs">Continue</Link>
                <button onClick={() => setShowDeleteModal(true)} className="text-red-500 hover:text-red-400 text-xs">
                  <Trash2 className="inline h-3 w-3 mr-0.5" />Delete
                </button>
              </>
            )}
            {listing.status === 'sold' && (
              <StatusBadge status="sold" />
            )}
          </div>
        </td>
      </tr>
      {showDeleteModal && (
        <DeleteModal listing={listing} onClose={() => setShowDeleteModal(false)} />
      )}
    </>
  )
}

interface SellerDashboardProps {
  listings: DashboardListing[]
  soldListings: SoldListing[]
  sellerTier: 'beginner' | 'trusted'
  notificationCount: number
}

export function SellerDashboard({ listings, soldListings, sellerTier, notificationCount }: SellerDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('published')

  const active = listings.filter(l => l.status === 'active')
  const pending = listings.filter(l => l.status === 'pending_inspection')
  const paused = listings.filter(l => l.status === 'paused')
  const drafts = listings.filter(l => l.status === 'draft')

  const counts: Record<Tab, number> = {
    published: active.length,
    pending: pending.length,
    paused: paused.length,
    sold: soldListings.length,
    drafts: drafts.length,
  }

  function currentListings(): (DashboardListing | SoldListing)[] {
    switch (activeTab) {
      case 'published': return active
      case 'pending': return pending
      case 'paused': return paused
      case 'sold': return soldListings
      case 'drafts': return drafts
    }
  }

  const isSoldTab = activeTab === 'sold'
  const isPriceTab = activeTab === 'published' || activeTab === 'paused'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1c1917]">My Listings</h1>
          {sellerTier === 'beginner' && (
            <p className="mt-1 text-xs text-[#a8a29e]">
              Your listings will go live after our team completes the inspection.
            </p>
          )}
        </div>
        <Link href="/seller/listings/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          + New Listing
        </Link>
      </div>

      {/* Cancellation Policy */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-semibold text-amber-800">Seller Cancellation Policy</p>
        <p className="mt-1 text-xs text-amber-700">
          If you cancel after a sale is completed, a 10% penalty on the sale price applies: 5% goes to the buyer as credit, 5% is retained by Coast.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#e7e5e4]">
        <nav className="flex gap-6">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'border-b-2 border-blue-600 text-[#1c1917]'
                  : 'text-[#78716c] hover:text-[#1c1917]'
              }`}
            >
              {tab.label}
              {counts[tab.value] > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  activeTab === tab.value ? 'bg-blue-100 text-blue-700' : 'bg-[#f5f5f4] text-[#78716c]'
                }`}>
                  {counts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Listing table */}
      {currentListings().length === 0 ? (
        <p className="py-8 text-center text-sm text-[#a8a29e]">
          {activeTab === 'published' && 'No published listings yet.'}
          {activeTab === 'pending' && 'No listings pending inspection.'}
          {activeTab === 'paused' && 'No paused listings.'}
          {activeTab === 'sold' && 'No sold listings yet.'}
          {activeTab === 'drafts' && 'No draft listings.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#e7e5e4]">
          <table className="w-full text-sm">
            <thead className="bg-[#faf9f6]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[#78716c]">Vehicle</th>
                {isPriceTab && <th className="px-4 py-3 text-left font-medium text-[#78716c]">Price</th>}
                {isSoldTab && (
                  <>
                    <th className="px-4 py-3 text-left font-medium text-[#78716c]">Sale Price</th>
                    <th className="px-4 py-3 text-left font-medium text-[#78716c]">Buyer</th>
                    <th className="px-4 py-3 text-left font-medium text-[#78716c]">Sale Date</th>
                    <th className="px-4 py-3 text-left font-medium text-[#78716c]">Status</th>
                  </>
                )}
                <th className="px-4 py-3 text-left font-medium text-[#78716c]">Listed</th>
                <th className="px-4 py-3 text-right font-medium text-[#78716c]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e5e4]">
              {currentListings().map(listing => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  showPrice={isPriceTab}
                  showSaleInfo={isSoldTab}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
