'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { PHOTO_SECTIONS } from '@/lib/photo-slots'
import { buildStorageKey, getPhotoPublicUrl } from '@/lib/storage'
import { createClient } from '@/lib/supabase/browser'
import { toast } from 'sonner'

interface SlottedPhoto {
  id: string
  storageKey: string
  url: string
  uploading?: boolean
}

interface InitialPhoto {
  id: string
  storage_key: string
  position: number
  slot_type: string | null
}

interface SlottedPhotoUploadProps {
  listingId: string
  initialPhotos: InitialPhoto[]
}

export function SlottedPhotoUpload({ listingId, initialPhotos }: SlottedPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingSlotRef = useRef<string | null>(null)

  const [slotPhotos, setSlotPhotos] = useState<Record<string, SlottedPhoto>>(() => {
    const map: Record<string, SlottedPhoto> = {}
    for (const p of initialPhotos) {
      if (p.slot_type) {
        map[p.slot_type] = {
          id: p.id,
          storageKey: p.storage_key,
          url: getPhotoPublicUrl(p.storage_key),
        }
      }
    }
    return map
  })

  function handleSlotClick(slotId: string) {
    pendingSlotRef.current = slotId
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const slotId = pendingSlotRef.current
    if (!file || !slotId) return
    e.target.value = ''

    const storageKey = buildStorageKey(listingId, file.name)
    const existingPhoto = slotPhotos[slotId]
    const preview = URL.createObjectURL(file)

    setSlotPhotos(prev => ({
      ...prev,
      [slotId]: { id: 'uploading', storageKey, url: preview, uploading: true },
    }))

    const supabase = createClient()

    try {
      if (existingPhoto && !existingPhoto.uploading) {
        await supabase.storage.from('car-photos').remove([existingPhoto.storageKey])
        await supabase.from('listing_photos').delete().eq('id', existingPhoto.id)
      }

      const { error: uploadError } = await supabase.storage
        .from('car-photos')
        .upload(storageKey, file, { contentType: file.type, cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: row, error: dbError } = await supabase
        .from('listing_photos')
        .insert({ listing_id: listingId, storage_key: storageKey, position: 0, slot_type: slotId })
        .select('id')
        .single()
      if (dbError) throw dbError

      setSlotPhotos(prev => ({
        ...prev,
        [slotId]: { id: row.id, storageKey, url: getPhotoPublicUrl(storageKey) },
      }))
    } catch {
      toast.error('Failed to upload photo')
      setSlotPhotos(prev => {
        const next = { ...prev }
        delete next[slotId]
        return next
      })
    }
  }

  async function handleDelete(slotId: string, e: React.MouseEvent) {
    e.stopPropagation()
    const photo = slotPhotos[slotId]
    if (!photo || photo.uploading) return

    const supabase = createClient()
    try {
      await supabase.storage.from('car-photos').remove([photo.storageKey])
      await supabase.from('listing_photos').delete().eq('id', photo.id)
      setSlotPhotos(prev => {
        const next = { ...prev }
        delete next[slotId]
        return next
      })
    } catch {
      toast.error('Failed to delete photo')
    }
  }

  const uploadedCount = Object.keys(slotPhotos).length

  return (
    <div className="space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {PHOTO_SECTIONS.map(section => (
        <div key={section.id}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {section.title}
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {section.slots.map(slot => {
              const photo = slotPhotos[slot.id]
              return (
                <div key={slot.id} className="group">
                  {photo ? (
                    <div
                      className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg"
                      onClick={() => handleSlotClick(slot.id)}
                    >
                      <img
                        src={photo.url}
                        alt={slot.label}
                        className="h-full w-full object-cover"
                      />
                      {photo.uploading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(slot.id, e)}
                          className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={`Remove ${slot.label}`}
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSlotClick(slot.id)}
                      className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900 text-zinc-600 transition-colors hover:border-zinc-500 hover:text-zinc-400"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                  <p className="mt-1 truncate text-center text-[10px] text-zinc-500">{slot.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-zinc-500">
        {uploadedCount} {uploadedCount === 1 ? 'photo' : 'photos'} uploaded — all optional
      </p>
    </div>
  )
}
