'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { promoteSellerTierAction } from '@/app/actions/admin'
import { toast } from 'sonner'

interface SellerTierButtonProps {
  userId: string
  currentTier: 'beginner' | 'trusted'
}

export function SellerTierButton({ userId, currentTier }: SellerTierButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const newTier = currentTier === 'beginner' ? 'trusted' : 'beginner'
    const result = await promoteSellerTierAction(userId, newTier)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success(`Seller ${newTier === 'trusted' ? 'promoted to Trusted' : 'demoted to Beginner'}`)
      router.refresh()
    }
    setLoading(false)
  }

  if (currentTier === 'trusted') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className="text-xs text-orange-600 hover:text-orange-500 disabled:opacity-50"
      >
        {loading ? '...' : 'Demote'}
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="text-xs text-emerald-600 hover:text-emerald-500 disabled:opacity-50"
    >
      {loading ? '...' : 'Promote to Trusted'}
    </button>
  )
}
