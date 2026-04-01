'use client'

import { useRef } from 'react'
import { SlottedPhotoUpload } from '@/components/listings/SlottedPhotoUpload'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Upload } from 'lucide-react'
import { PHOTO_SECTIONS } from '@/lib/photo-slots'
import { buildStorageKey } from '@/lib/storage'
import { createClient } from '@/lib/supabase/browser'
import { toast } from 'sonner'

interface StepPhotosProps {
  listingId: string
  initialPhotos: { id: string; storage_key: string; position: number; slot_type: string | null }[]
  onSave: () => void
  onBack: () => void
}

export function StepPhotos({ listingId, initialPhotos, onSave, onBack }: StepPhotosProps) {
  const bulkInputRef = useRef<HTMLInputElement>(null)

  // Flatten all slots in order for bulk assignment
  const allSlots = PHOTO_SECTIONS.flatMap(s => s.slots)

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    const supabase = createClient()

    // Determine which slots are already filled
    const filledSlots = new Set((initialPhotos ?? []).map(p => p.slot_type).filter(Boolean))
    const emptySlots = allSlots.filter(s => !filledSlots.has(s.id))

    const filesToUpload = files.slice(0, emptySlots.length)

    if (filesToUpload.length === 0) {
      toast.info('All photo slots are already filled.')
      return
    }

    toast.info(`Uploading ${filesToUpload.length} photo${filesToUpload.length > 1 ? 's' : ''}…`)

    const results = await Promise.allSettled(
      filesToUpload.map(async (file, i) => {
        const slot = emptySlots[i]
        const storageKey = buildStorageKey(listingId, file.name)

        const { error: uploadError } = await supabase.storage
          .from('car-photos')
          .upload(storageKey, file, { contentType: file.type, cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError

        const { error: dbError } = await supabase
          .from('listing_photos')
          .insert({ listing_id: listingId, storage_key: storageKey, position: i, slot_type: slot.id })
        if (dbError) throw dbError
      })
    )

    const failed = results.filter(r => r.status === 'rejected').length
    const succeeded = filesToUpload.length - failed

    if (succeeded > 0) {
      toast.success(`${succeeded} photo${succeeded > 1 ? 's' : ''} uploaded. You can rearrange them below.`)
    }
    if (failed > 0) {
      toast.error(`${failed} photo${failed > 1 ? 's' : ''} failed to upload.`)
    }

    // Reload page state — simplest approach is to refresh
    window.location.reload()
  }

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-4 sm:p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Photos</h2>
      <p className="mb-4 text-sm text-[#78716c]">
        Add photos for each section. More photos help buyers decide faster.
      </p>

      {/* Bulk upload */}
      <div className="mb-6">
        <input
          ref={bulkInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleBulkUpload}
        />
        <button
          type="button"
          onClick={() => bulkInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#e7e5e4] bg-[#faf9f6] py-3 text-sm text-[#78716c] hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload all photos at once
        </button>
        <p className="mt-1.5 text-center text-xs text-[#a8a29e]">
          Select multiple files — they'll be auto-assigned to slots. You can swap individual slots below.
        </p>
      </div>

      <SlottedPhotoUpload listingId={listingId} initialPhotos={initialPhotos} />

      <div className="mt-6 flex flex-col gap-2">
        <Button
          type="button"
          onClick={onSave}
          className="w-full bg-blue-600 text-white hover:bg-blue-500"
        >
          Continue
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1 text-sm text-[#a8a29e] hover:text-[#78716c] transition-colors py-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Vehicle Details
        </button>
      </div>
    </div>
  )
}
