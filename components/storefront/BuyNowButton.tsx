'use client'

import { useFormStatus } from 'react-dom'

interface BuyNowButtonProps {
  priceCents: number | null
}

/**
 * Client component that shows loading state while Stripe session is being created.
 * Must be rendered inside a <form> element using the useFormStatus hook.
 */
export function BuyNowButton({ priceCents }: BuyNowButtonProps) {
  const { pending } = useFormStatus()

  const priceLabel =
    priceCents != null ? `$${(priceCents / 100).toLocaleString()}` : '—'

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Processing...' : `Buy Now — ${priceLabel}`}
    </button>
  )
}
