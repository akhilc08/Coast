'use client'

import { useTransition } from 'react'
import { banUserAction, unbanUserAction } from '@/app/actions/admin'

interface BanToggleButtonProps {
  userId: string
  isBanned: boolean
}

export function BanToggleButton({ userId, isBanned }: BanToggleButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      if (isBanned) {
        await unbanUserAction(userId)
      } else {
        await banUserAction(userId)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={
        isBanned
          ? 'text-xs px-2 py-1 rounded border border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c] hover:bg-[#e7e5e4] disabled:opacity-50 cursor-pointer transition-colors'
          : 'text-xs px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 cursor-pointer transition-colors'
      }
    >
      {isPending ? '...' : isBanned ? 'Enable' : 'Disable'}
    </button>
  )
}
