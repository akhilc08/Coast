'use client'

import { SlottedPhotoUpload } from '@/components/listings/SlottedPhotoUpload'
import { BulkPhotoUpload } from '@/components/listings/BulkPhotoUpload'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface StepPhotosProps {
  listingId: string
  initialPhotos: { id: string; storage_key: string; position: number; slot_type: string | null }[]
  onSave: () => void
  onBack?: () => void
}

export function StepPhotos({ listingId, initialPhotos, onSave, onBack }: StepPhotosProps) {
  const [mode, setMode] = useState<'bulk' | 'slotted'>('bulk')

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Photos</h2>
      <p className="mb-4 text-sm text-[#78716c]">
        Add photos for each section. More photos help buyers make decisions faster.
      </p>

      {/* Upload mode toggle */}
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('bulk')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'bulk' ? 'bg-blue-600 text-white' : 'bg-[#f5f5f4] text-[#78716c] hover:bg-[#e7e5e4]'
          }`}
        >
          Bulk Upload
        </button>
        <button
          type="button"
          onClick={() => setMode('slotted')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'slotted' ? 'bg-blue-600 text-white' : 'bg-[#f5f5f4] text-[#78716c] hover:bg-[#e7e5e4]'
          }`}
        >
          Slot-by-Slot
        </button>
      </div>

      {mode === 'bulk' ? (
        <BulkPhotoUpload listingId={listingId} initialPhotos={initialPhotos} />
      ) : (
        <SlottedPhotoUpload listingId={listingId} initialPhotos={initialPhotos} />
      )}

      <div className="mt-6 flex gap-3">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 border-[#e7e5e4] text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]"
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={onSave}
          className={`${onBack ? 'flex-1' : 'w-full'} bg-blue-600 text-white hover:bg-blue-500`}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
