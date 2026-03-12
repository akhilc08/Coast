'use client'

import { useState, useTransition } from 'react'
import { StarPicker } from './StarPicker'
import { submitReview } from '@/app/actions/reviews'

interface ReviewFormProps {
  orderId: string
}

export function ReviewForm({ orderId }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitReview(orderId, rating, body)
      if ('error' in result) {
        setError(result.error)
      }
      // On success the page revalidates and shows the read-only review
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-[#1c1917]">Your Rating</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div>
        <label htmlFor="review-body" className="mb-2 block text-sm font-medium text-[#1c1917]">
          Your Review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="How was your experience with this seller?"
          rows={4}
          className="w-full rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-3 py-2 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917] resize-none"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending || rating === 0 || !body.trim()}
        className="w-full rounded-xl bg-[#1c1917] py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {isPending ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}
