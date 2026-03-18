'use client'

import { SlottedPhotoUpload } from '@/components/listings/SlottedPhotoUpload'
import { Button } from '@/components/ui/button'

interface StepPhotosProps {
  listingId: string
  initialPhotos: { id: string; storage_key: string; position: number; slot_type: string | null }[]
  onSave: () => void
}

export function StepPhotos({ listingId, initialPhotos, onSave }: StepPhotosProps) {
  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Photos</h2>
      <p className="mb-6 text-sm text-[#78716c]">
        Add photos for each section. None are required, but more photos help buyers make decisions faster.
      </p>

      <SlottedPhotoUpload listingId={listingId} initialPhotos={initialPhotos} />

      <div className="mt-6">
        <Button
          type="button"
          onClick={onSave}
          className="w-full bg-blue-600 text-white hover:bg-blue-500"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
