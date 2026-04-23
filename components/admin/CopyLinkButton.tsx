'use client'

import { useState } from 'react'

const FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLSdDMHRwk81mOkjj7L5YVmrTaRcu6tDe20cy9dfjXMC4boRGVQ/viewform'

export function CopyLinkButton({ vin }: { vin: string }) {
  const [copied, setCopied] = useState(false)

  const url = `${FORM_BASE}?usp=pp_url&entry.1357367560=${encodeURIComponent(vin)}&entry.1870065493=${encodeURIComponent(vin)}`

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 rounded-lg bg-[#f5f4f0] px-3 py-2 text-xs text-[#78716c] truncate select-all">
        {url}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-xs font-medium text-[#1c1917] hover:bg-[#faf9f6] transition-colors"
      >
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  )
}
