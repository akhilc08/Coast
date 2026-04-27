'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteListingAction } from '@/app/actions/admin'

export function DeleteListingRowButton({ listingId }: { listingId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    startTransition(async () => {
      await deleteListingAction(listingId)
      router.refresh()
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setConfirming(false) }}
          disabled={isPending}
          className="rounded px-2 py-1 text-xs text-[#78716c] hover:bg-[#f5f4f0] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
        >
          {isPending ? '…' : 'Confirm'}
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); e.preventDefault(); setConfirming(true) }}
      className="rounded p-1.5 text-[#a8a29e] hover:bg-red-50 hover:text-red-500 transition-colors"
      title="Delete listing"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </button>
  )
}
