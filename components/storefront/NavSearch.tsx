'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { Search } from 'lucide-react'

export function NavSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    router.push(q ? `/inventory?q=${encodeURIComponent(q)}` : '/inventory')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 max-w-[480px] items-center gap-2 rounded-[10px] bg-[#f3f4f6] px-4 h-10"
    >
      <Search size={16} className="shrink-0 text-[#9ca3af]" />
      <input
        ref={inputRef}
        placeholder="Search make, model, or keyword…"
        className="flex-1 bg-transparent text-sm text-[#374151] outline-none placeholder:text-[#9ca3af]"
      />
    </form>
  )
}
