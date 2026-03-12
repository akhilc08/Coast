'use client'

import { useState, useTransition } from 'react'
import { submitSellerReply } from '@/app/actions/reviews'

interface SellerReplyFormProps {
  reviewId: string
}

export function SellerReplyForm({ reviewId }: SellerReplyFormProps) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-[#78716c] hover:text-[#1c1917] transition-colors"
      >
        Reply to this review
      </button>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitSellerReply(reviewId, body)
      if ('error' in result) {
        setError(result.error)
      }
      // On success the page revalidates and the reply renders server-side
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Your Response</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your response…"
        rows={3}
        className="w-full rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-3 py-2 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917] resize-none"
        required
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="rounded-lg bg-[#1c1917] px-4 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {isPending ? 'Submitting…' : 'Submit Response'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[#e7e5e4] px-4 py-1.5 text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
