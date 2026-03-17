'use client'

import { useState, useTransition } from 'react'
import { updateSellerBioAction } from '@/app/actions/profile'

export function BioEditor({ initialBio }: { initialBio: string }) {
  const [bio, setBio] = useState(initialBio)
  const [savedBio, setSavedBio] = useState(initialBio)
  const [isPending, startTransition] = useTransition()

  const isDirty = bio !== savedBio

  function handleSave() {
    startTransition(async () => {
      await updateSellerBioAction(bio)
      setSavedBio(bio)
    })
  }

  return (
    <div className="space-y-4">
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={5}
        maxLength={600}
        placeholder="e.g. Family-owned dealership serving the Dallas area since 2005. We specialize in clean pre-owned domestic trucks and SUVs..."
        className="w-full rounded-lg border border-[#e7e5e4] bg-white px-4 py-3 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-500 focus:outline-none resize-none"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#a8a29e]">Max 600 characters</p>
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
