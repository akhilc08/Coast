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
          ? 'text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600 disabled:opacity-50'
          : 'text-xs px-2 py-1 rounded bg-red-900 text-red-200 hover:bg-red-800 disabled:opacity-50'
      }
    >
      {isPending ? '...' : isBanned ? 'Enable' : 'Disable'}
    </button>
  )
}
