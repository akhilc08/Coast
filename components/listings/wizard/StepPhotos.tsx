'use client'

import { useRef, useState } from 'react'
import { SlottedPhotoUpload } from '@/components/listings/SlottedPhotoUpload'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Upload, Sparkles } from 'lucide-react'
import { PHOTO_SECTIONS } from '@/lib/photo-slots'
import { buildStorageKey, getPhotoPublicUrl } from '@/lib/storage'
import { createClient } from '@/lib/supabase/browser'
import { toast } from 'sonner'

interface StepPhotosProps {
  listingId: string
  initialPhotos: { id: string; storage_key: string; position: number; slot_type: string | null }[]
  onSave: () => void
  onBack?: () => void
}

export function StepPhotos({ listingId, initialPhotos, onSave, onBack }: StepPhotosProps) {
  const bulkInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState(initialPhotos)
  const [slottedKey, setSlottedKey] = useState(0)

  // Flatten all slots in order for bulk assignment
  const allSlots = PHOTO_SECTIONS.flatMap(s => s.slots)

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    const supabase = createClient()
    const filesToUpload = files.slice(0, allSlots.length)

    toast.info(`Uploading ${filesToUpload.length} photo${filesToUpload.length > 1 ? 's' : ''}…`)

    // Upload all files without pre-assigning slots
    const results = await Promise.allSettled(
      filesToUpload.map(async (file) => {
        const storageKey = buildStorageKey(listingId, file.name)

        const { error: uploadError } = await supabase.storage
          .from('car-photos')
          .upload(storageKey, file, { contentType: file.type, cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError

        const { data: row, error: dbError } = await supabase
          .from('listing_photos')
          .insert({ listing_id: listingId, storage_key: storageKey, position: 0, slot_type: null })
          .select('id')
          .single()
        if (dbError) throw dbError

        return { id: row.id as string, url: getPhotoPublicUrl(storageKey) }
      })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<{ id: string; url: string }>[]
    const failed = results.filter(r => r.status === 'rejected').length

    if (failed > 0) toast.error(`${failed} photo${failed > 1 ? 's' : ''} failed to upload.`)
    if (!succeeded.length) return

    const uploadedPhotos = succeeded.map(r => r.value)

    // AI classification
    toast.info('Classifying photos with AI…')

    type Assignment = { id: string; slot_type: string; confidence: number }
    let aiAssignments: Assignment[] = []
    try {
      const res = await fetch('/api/listings/organize-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: uploadedPhotos }),
      })
      const { assignments } = await res.json() as { assignments: Assignment[] }
      if (assignments?.length) aiAssignments = assignments
    } catch {
      // fall through to sequential assignment below
    }

    // Build map of existing slot → photo for potential replacement
    const existingSlotMap = new Map(
      photos.filter(p => p.slot_type).map(p => [p.slot_type!, p])
    )

    // Decide what to do with each AI-assigned photo
    const CONFIDENCE_THRESHOLD = 0.75
    const finalMap: Record<string, string> = {}
    const photosToDelete: { id: string; storage_key: string }[] = []

    for (const a of aiAssignments) {
      const existing = existingSlotMap.get(a.slot_type)
      if (!existing) {
        // Slot is free — assign directly
        finalMap[a.id] = a.slot_type
      } else if (a.confidence >= CONFIDENCE_THRESHOLD) {
        // High-confidence match — replace existing photo
        photosToDelete.push({ id: existing.id, storage_key: existing.storage_key })
        existingSlotMap.delete(a.slot_type)
        finalMap[a.id] = a.slot_type
      }
      // Low confidence + occupied → fall through to sequential assignment below
    }

    // For any photo not yet assigned, fill next available slot sequentially
    const usedSlots = new Set([
      ...Object.values(finalMap),
      ...[...existingSlotMap.keys()],
    ])
    const remainingSlots = allSlots.map(s => s.id).filter(id => !usedSlots.has(id))
    let slotIdx = 0
    for (const p of uploadedPhotos) {
      if (!finalMap[p.id] && slotIdx < remainingSlots.length) {
        finalMap[p.id] = remainingSlots[slotIdx++]
      }
    }

    // Delete replaced photos from storage + DB
    await Promise.allSettled(
      photosToDelete.map(async ({ id, storage_key }) => {
        await supabase.storage.from('car-photos').remove([storage_key])
        await supabase.from('listing_photos').delete().eq('id', id)
      })
    )

    // Persist new slot assignments to DB
    await Promise.allSettled(
      Object.entries(finalMap).map(([id, slot_type]) =>
        supabase.from('listing_photos').update({ slot_type }).eq('id', id)
      )
    )

    const deletedIds = new Set(photosToDelete.map(d => d.id))
    const newPhotos = uploadedPhotos.map(p => ({
      id: p.id,
      storage_key: p.url.split('/car-photos/')[1] ?? p.url,
      position: 0,
      slot_type: finalMap[p.id] ?? null,
    }))
    setPhotos(prev => [...prev.filter(p => !deletedIds.has(p.id)), ...newPhotos])
    setSlottedKey(k => k + 1)
    const classified = aiAssignments.filter(a => finalMap[a.id]).length
    if (classified > 0) {
      toast.success(`${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? 's' : ''} uploaded and sorted by AI.`)
    } else {
      toast.success(`${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? 's' : ''} uploaded and assigned to slots.`)
    }
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
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
        </button>
        <p className="mt-1.5 text-center text-xs text-[#a8a29e]">
          Select multiple files — AI will classify them into the right slots automatically.
        </p>
      </div>

      <SlottedPhotoUpload key={slottedKey} listingId={listingId} initialPhotos={photos} />

      <div className="mt-6 flex flex-col gap-2 px-0 sm:-mx-2">
        <Button
          type="button"
          onClick={onSave}
          className="w-full bg-blue-600 text-white hover:bg-blue-500"
        >
          Save &amp; Continue
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
