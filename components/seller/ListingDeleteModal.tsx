'use client'

import { useState } from 'react'
import { Pause, Trash2, X } from 'lucide-react'
import { pauseListingAction, deleteListingAction } from '@/app/actions/listings'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ListingDeleteModalProps {
  listingId: string
  vehicleLabel: string
  onClose: () => void
}

export function ListingDeleteModal({ listingId, vehicleLabel, onClose }: ListingDeleteModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'pause' | 'delete' | null>(null)

  async function handlePause() {
    setLoading('pause')
    const res = await pauseListingAction(listingId)
    if ('error' in res) {
      toast.error(res.error)
      setLoading(null)
      return
    }
    toast.success('Listing paused')
    onClose()
    router.refresh()
  }

  async function handleDelete() {
    setLoading('delete')
    const res = await deleteListingAction(listingId)
    if ('error' in res) {
      toast.error(res.error)
      setLoading(null)
      return
    }
    toast.success('Listing deleted')
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-[#e7e5e4] bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e7e5e4]">
          <h2 className="text-sm font-semibold text-[#1c1917]">Remove listing</h2>
          <button onClick={onClose} className="text-[#a8a29e] hover:text-[#1c1917]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-[#78716c] mb-4">
            What would you like to do with <span className="font-medium text-[#1c1917]">{vehicleLabel}</span>?
          </p>

          <div className="space-y-2">
            <button
              onClick={handlePause}
              disabled={loading !== null}
              className="w-full flex items-start gap-3 rounded-lg border border-[#e7e5e4] bg-[#faf9f6] p-3 text-left hover:border-[#1c1917] transition-colors disabled:opacity-50"
            >
              <Pause className="h-4 w-4 mt-0.5 text-[#78716c] flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#1c1917]">
                  {loading === 'pause' ? 'Pausing...' : 'Pause temporarily'}
                </p>
                <p className="text-xs text-[#a8a29e] mt-0.5">
                  Hold off on Coast for now. Reactivate anytime from your dashboard.
                </p>
              </div>
            </button>

            <button
              onClick={handleDelete}
              disabled={loading !== null}
              className="w-full flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-left hover:border-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-600">
                  {loading === 'delete' ? 'Deleting...' : 'Delete permanently'}
                </p>
                <p className="text-xs text-red-400 mt-0.5">
                  This cannot be undone. If you relist this car it will need to be reinspected.
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            disabled={loading !== null}
            className="w-full rounded-lg border border-[#e7e5e4] py-2 text-sm text-[#78716c] hover:text-[#1c1917] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
