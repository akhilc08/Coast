'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveListingAction } from '@/app/actions/admin'
import { toast } from 'sonner'

export function ApproveListingButton({ listingId }: { listingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    setLoading(true)
    const result = await approveListingAction(listingId)
    if ('error' in result) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    toast.success('Listing approved and published!')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={loading}
      className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
    >
      {loading ? 'Approving...' : 'Approve & Publish Listing'}
    </button>
  )
}
