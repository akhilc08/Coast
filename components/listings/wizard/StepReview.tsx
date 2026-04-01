'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { publishListingAction, submitForInspectionAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'

interface StepReviewProps {
  listingId: string
  listingStatus: string
  sellerTier: number
  onBack: () => void
}

export function StepReview({ listingId, listingStatus, sellerTier, onBack }: StepReviewProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isPublished = listingStatus === 'active'
  const isPending   = listingStatus === 'pending_inspection'

  async function handlePublish() {
    setLoading(true)
    try {
      const result = await publishListingAction(listingId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Listing published!')
      router.push('/seller/dashboard')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitForInspection() {
    setLoading(true)
    try {
      const result = await submitForInspectionAction(listingId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Submitted for inspection. We\'ll notify you when it\'s live.')
      router.push('/seller/dashboard')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-4 sm:p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">
        {isPublished ? 'Save Changes' : 'Review & Submit'}
      </h2>
      <p className="mb-6 text-sm text-[#78716c]">
        {isPublished
          ? 'Your listing is live. Any changes will be visible to buyers immediately.'
          : sellerTier >= 2
            ? 'Your listing is ready to publish. Make sure all details look correct.'
            : 'Once you submit, our team will inspect the vehicle and make your listing live. You\'ll be notified by email.'}
      </p>

      {isPending && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">
            This listing is already submitted for inspection. You can still edit details while it awaits approval.
          </p>
        </div>
      )}

      {!isPublished && !isPending && (
        <div className="mb-6 rounded-lg border border-[#e7e5e4] bg-[#faf9f6] p-4">
          <p className="text-sm text-[#78716c]">
            Make sure make, model, year, price, and ZIP code are filled in before submitting.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isPublished ? (
          <>
            <Button
              type="button"
              onClick={() => router.push('/seller/dashboard')}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
            >
              Save & Return to Dashboard
            </Button>
          </>
        ) : sellerTier >= 2 ? (
          <>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Listing'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/seller/dashboard')}
              className="w-full border-[#e7e5e4] text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]"
            >
              Save as Draft
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={handleSubmitForInspection}
              disabled={loading || isPending}
              className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : isPending ? 'Already Submitted' : 'Submit for Inspection'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/seller/dashboard')}
              className="w-full border-[#e7e5e4] text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]"
            >
              Save as Draft
            </Button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 flex items-center gap-1 text-sm text-[#a8a29e] hover:text-[#78716c] transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Photos
      </button>
    </div>
  )
}
