'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { publishListingAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface StepReviewProps {
  listingId: string
}

export function StepReview({ listingId }: StepReviewProps) {
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)

  async function handlePublish() {
    setPublishing(true)
    try {
      const result = await publishListingAction(listingId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Listing published!')
      router.push('/seller/dashboard')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-1 text-xl font-semibold text-zinc-100">Review & Publish</h2>
      <p className="mb-6 text-sm text-zinc-400">Your listing is ready. You can save it as a draft or publish it now to make it live.</p>

      <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <p className="text-sm text-zinc-400">
          Make sure all required fields (make, model, year, price) are filled in before publishing. You can continue editing after publishing.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/seller/dashboard')}
          className="flex-1 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {publishing ? 'Publishing...' : 'Publish Listing'}
        </Button>
      </div>
    </div>
  )
}
