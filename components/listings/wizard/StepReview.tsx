'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { publishListingAction, submitForReviewAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface StepReviewProps {
  listingId: string
  sellerTier?: 'beginner' | 'trusted'
  isPublished?: boolean
  onBack?: () => void
}

export function StepReview({ listingId, sellerTier = 'beginner', isPublished = false, onBack }: StepReviewProps) {
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  async function handleSubmitForReview() {
    setSubmitting(true)
    try {
      const result = await submitForReviewAction(listingId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Listing submitted for review! You\'ll be notified when it goes live.')
      router.push('/seller/dashboard')
    } finally {
      setSubmitting(false)
    }
  }

  const isBeginner = sellerTier === 'beginner'

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Review & Submit</h2>
      <p className="mb-6 text-sm text-[#78716c]">
        {isBeginner
          ? 'Your listing will go live after our team completes the inspection.'
          : isPublished
            ? 'Review and save your changes.'
            : 'Your listing is ready. You can save it as a draft or publish it now.'}
      </p>

      {isBeginner && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">Inspection Required</p>
          <p className="mt-1 text-xs text-blue-600">
            Your listing will go live after our team completes the inspection. You&apos;ll receive a notification when it&apos;s approved.
          </p>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-[#e7e5e4] bg-[#faf9f6] p-4">
        <p className="text-sm text-[#78716c]">
          Make sure all required fields (make, model, year, price) are filled in. You can continue editing after submitting.
        </p>
      </div>

      <div className="flex gap-3">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="border-[#e7e5e4] text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]"
          >
            Back
          </Button>
        )}

        {isBeginner ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/seller/dashboard')}
              className="flex-1 border-[#e7e5e4] text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={handleSubmitForReview}
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </>
        ) : isPublished ? (
          <Button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {publishing ? 'Saving...' : 'Save Changes'}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/seller/dashboard')}
              className="flex-1 border-[#e7e5e4] text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]"
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
          </>
        )}
      </div>
    </div>
  )
}
