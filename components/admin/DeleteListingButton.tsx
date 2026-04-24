'use client'

import { useState, useTransition } from 'react'
import { deleteListingAction } from '@/app/actions/admin'

interface Props {
  listingId: string
  listingName: string
  redirectAfter?: string
}

export function DeleteListingButton({ listingId, listingName, redirectAfter }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteListingAction(listingId)
      if ('error' in result) {
        setError(result.error)
        setConfirming(false)
      } else {
        window.location.href = redirectAfter ?? '/admin/listings'
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#78716c]">Delete {listingName}?</span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded-lg border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-medium text-[#78716c] hover:bg-[#faf9f6] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Deleting…' : 'Confirm Delete'}
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
    >
      Delete Listing
    </button>
  )
}
