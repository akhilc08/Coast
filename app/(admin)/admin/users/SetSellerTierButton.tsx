'use client'

import { useTransition } from 'react'
import { setSellerTierAction } from '@/app/actions/admin'

interface SetSellerTierButtonProps {
  userId: string
  currentTier: number
}

export function SetSellerTierButton({ userId, currentTier }: SetSellerTierButtonProps) {
  const [isPending, startTransition] = useTransition()
  const isTrusted = currentTier >= 2

  function handleClick() {
    startTransition(async () => {
      await setSellerTierAction(userId, isTrusted ? 1 : 2)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={
        isTrusted
          ? 'text-xs px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer transition-colors'
          : 'text-xs px-2 py-1 rounded border border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c] hover:bg-[#e7e5e4] disabled:opacity-50 cursor-pointer transition-colors'
      }
    >
      {isPending ? '...' : isTrusted ? 'Trusted' : 'Set Trusted'}
    </button>
  )
}
