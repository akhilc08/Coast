'use client'

import { useState } from 'react'
import { adminApproveListingAction } from '@/app/actions/listings'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

interface AdminApproveButtonProps {
  listingId: string
}

export function AdminApproveButton({ listingId }: AdminApproveButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    if (!confirm('Approve this listing and make it live? The seller will be notified by email.')) return
    setLoading(true)
    const res = await adminApproveListingAction(listingId)
    if ('error' in res) {
      toast.error(res.error)
      setLoading(false)
      return
    }
    toast.success('Listing approved and now live')
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleApprove}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors flex-shrink-0"
    >
      <CheckCircle className="h-4 w-4" />
      {loading ? 'Approving...' : 'Approve & Make Live'}
    </button>
  )
}
