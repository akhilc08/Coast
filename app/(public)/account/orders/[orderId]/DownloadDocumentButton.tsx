'use client'

import { useState, useTransition } from 'react'
import { getOrderDocumentUrl } from '@/app/actions/orders'

interface Props {
  documentId: string
}

export function DownloadDocumentButton({ documentId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDownload() {
    setError(null)
    startTransition(async () => {
      try {
        const url = await getOrderDocumentUrl(documentId)
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Download failed')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDownload}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Generating\u2026' : 'Download'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
