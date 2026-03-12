'use client'

import { useState } from 'react'
import { PhotoUploadZone, type PhotoItem } from '@/components/listings/PhotoUploadZone'
import { upsertPhotoPositionsAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface StepPhotosProps {
  listingId: string
  initialPhotos: { id: string; storage_key: string; position: number }[]
  onSave: () => void
}

export function StepPhotos({ listingId, initialPhotos, onSave }: StepPhotosProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [saving, setSaving] = useState(false)

  async function handleContinue() {
    setSaving(true)
    try {
      if (photos.length > 0) {
        const positions = photos
          .filter(p => !p.uploading)
          .map((p, i) => ({ id: p.id, position: i }))
        const result = await upsertPhotoPositionsAction(positions)
        if ('error' in result) {
          toast.error(result.error)
          return
        }
      }
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Photos</h2>
      <p className="mb-6 text-sm text-[#78716c]">Upload photos of the vehicle. Drag to reorder — the first photo will be the hero image.</p>

      <PhotoUploadZone
        listingId={listingId}
        initialPhotos={initialPhotos}
        onChange={setPhotos}
      />

      <div className="mt-6">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
