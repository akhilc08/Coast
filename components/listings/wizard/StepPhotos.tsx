'use client'

import { useState, useCallback, useId } from 'react'
import { useDropzone } from 'react-dropzone'
import { SlottedPhotoUpload } from '@/components/listings/SlottedPhotoUpload'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Sparkles, Loader2 } from 'lucide-react'
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

import { normalizeImage } from '@/lib/normalize-image'

// Resize a File to max 1024px on longest side, JPEG at 80% quality — small enough for API payloads
function resizeToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 1024
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX }
        else { width = Math.round((width * MAX) / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1])
    }
    img.onerror = reject
    img.src = objectUrl
  })
}

const CLASSIFY_BATCH = 6

export function StepPhotos({ listingId, initialPhotos, onSave, onBack }: StepPhotosProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [slottedKey, setSlottedKey] = useState(0)
  const [classifying, setClassifying] = useState(false)
  const toastId = useId()

  // Flatten all slots in order for bulk assignment
  const allSlots = PHOTO_SECTIONS.flatMap(s => s.slots)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return

    const supabase = createClient()
    const filesToUpload = acceptedFiles.slice(0, allSlots.length)

    setClassifying(true)
    toast.loading(`Uploading ${filesToUpload.length} photo${filesToUpload.length > 1 ? 's' : ''}…`, { id: toastId })

    const results = await Promise.allSettled(
      filesToUpload.map(async (file) => {
        // Convert HEIC if needed first, then build storage key from normalized name
        const normalized = await normalizeImage(file)
        const storageKey = buildStorageKey(listingId, normalized.name)

        // Resize for AI classification — may fail for unconvertible HEIC; upload still proceeds
        const [base64Result, uploadResult] = await Promise.all([
          resizeToBase64(normalized).then(b => b).catch(() => null),
          supabase.storage
            .from('car-photos')
            .upload(storageKey, normalized, { contentType: normalized.type, cacheControl: '3600', upsert: false }),
        ])

        if (uploadResult.error) {
          console.error('[upload] storage error:', uploadResult.error)
          throw uploadResult.error
        }

        const { data: row, error: dbError } = await supabase
          .from('listing_photos')
          .insert({ listing_id: listingId, storage_key: storageKey, position: 0, slot_type: null })
          .select('id')
          .single()
        if (dbError) throw dbError

        return {
          id: row.id as string,
          url: getPhotoPublicUrl(storageKey),
          base64: base64Result,
        }
      })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<{ id: string; url: string; base64: string | null }>[]
    const failedResults = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
    failedResults.forEach((r, i) => console.error(`[upload] file ${i} failed:`, r.reason))

    if (failedResults.length > 0) toast.error(`${failedResults.length} photo${failedResults.length > 1 ? 's' : ''} failed to upload.`)
    if (!succeeded.length) { setClassifying(false); return }

    const uploadedPhotos = succeeded.map(r => r.value)

    // AI classification — send resized base64 in small batches to stay under payload limits
    toast.loading('Classifying photos with AI — this takes about 30 seconds…', { id: toastId })

    type Assignment = { id: string; slot_type: string; confidence: number }
    const aiAssignments: Assignment[] = []
    try {
      for (let i = 0; i < uploadedPhotos.length; i += CLASSIFY_BATCH) {
        const chunk = uploadedPhotos.slice(i, i + CLASSIFY_BATCH).filter(p => p.base64 !== null)
        if (!chunk.length) continue
        const res = await fetch('/api/listings/organize-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photos: chunk.map(p => ({ id: p.id, base64: p.base64 })),
          }),
        })
        const json = await res.json() as { assignments?: Assignment[]; errors?: string[]; error?: string }
        if (!res.ok) throw new Error(json.error ?? 'Classification failed')
        if (json.errors?.length) console.error('[classify] batch errors:', json.errors)
        if (json.assignments?.length) aiAssignments.push(...json.assignments)
      }
    } catch (err) {
      console.error('AI classification error:', err)
      toast.error('AI classification failed — place photos manually', { id: toastId })
    }

    // Build map of existing slot → photo for potential replacement
    const existingSlotMap = new Map(
      photos.filter(p => p.slot_type).map(p => [p.slot_type!, p])
    )

    // Accept all AI assignments — trust Claude, no confidence cutoff
    const finalMap: Record<string, string> = {}
    const photosToDelete: { id: string; storage_key: string }[] = []

    for (const a of aiAssignments) {
      const existing = existingSlotMap.get(a.slot_type)
      if (!existing) {
        finalMap[a.id] = a.slot_type
      } else if (a.confidence >= 0.85) {
        // Replace existing only if very high confidence
        photosToDelete.push({ id: existing.id, storage_key: existing.storage_key })
        existingSlotMap.delete(a.slot_type)
        finalMap[a.id] = a.slot_type
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
    setPhotos(prev => {
      const merged = [...prev.filter(p => !deletedIds.has(p.id)), ...newPhotos]
      const seen = new Set<string>()
      return merged.filter(p => !seen.has(p.id) && seen.add(p.id))
    })
    setSlottedKey(k => k + 1)
    setClassifying(false)
    const classified = Object.keys(finalMap).length
    const unclassified = uploadedPhotos.length - classified
    if (unclassified === 0) {
      toast.success(`${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? 's' : ''} uploaded and sorted by AI.`, { id: toastId })
    } else {
      toast.success(`${uploadedPhotos.length} uploaded — ${classified} sorted by AI, ${unclassified} need placement.`, { id: toastId })
    }
  }, [listingId, allSlots.length, photos, toastId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    disabled: classifying,
    onDrop,
  })

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-4 sm:p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Photos</h2>
      <p className="mb-4 text-sm text-[#78716c]">
        Add photos for each section. More photos help buyers decide faster.
      </p>

      {/* Bulk drop zone */}
      <div className="mb-6">
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : classifying
              ? 'border-[#e7e5e4] bg-[#faf9f6] opacity-60 cursor-not-allowed'
              : 'border-[#e7e5e4] bg-[#faf9f6] hover:border-blue-400 hover:bg-blue-50/40'
          }`}
        >
          <input {...getInputProps()} />
          {classifying ? (
            <>
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-blue-600">Uploading & classifying with AI…</p>
            </>
          ) : (
            <>
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-blue-400" />
              <p className="text-sm font-medium text-[#1c1917]">
                {isDragActive ? 'Drop photos here' : 'Drag & drop photos here, or click to select'}
              </p>
              <p className="mt-1 text-xs text-[#a8a29e]">
                AI will automatically sort each photo into the right slot
              </p>
            </>
          )}
        </div>
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
