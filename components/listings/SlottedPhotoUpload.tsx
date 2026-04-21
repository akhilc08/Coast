'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2, Plus } from 'lucide-react'

import { normalizeImage } from '@/lib/normalize-image'
import { PHOTO_SECTIONS, PHOTO_SLOT_ORDER } from '@/lib/photo-slots'
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

let tempIdCounter = 0

export function SlottedPhotoUpload({ listingId, initialPhotos }: SlottedPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const damageInputRef = useRef<HTMLInputElement>(null)
  const pendingSlotRef = useRef<string | null>(null)

  const [slotPhotos, setSlotPhotos] = useState<Record<string, SlottedPhoto>>(() => {
    const map: Record<string, SlottedPhoto> = {}
    for (const p of initialPhotos) {
      if (p.slot_type && p.slot_type !== 'damage') {
        map[p.slot_type] = {
          id: p.id,
          storageKey: p.storage_key,
          url: getPhotoPublicUrl(p.storage_key),
        }
      }
    }
    return map
  })

  const [damagePhotos, setDamagePhotos] = useState<SlottedPhoto[]>(() => {
    const seen = new Set<string>()
    return initialPhotos
      .filter(p => p.slot_type === 'damage' && !seen.has(p.id) && seen.add(p.id))
      .map(p => ({ id: p.id, storageKey: p.storage_key, url: getPhotoPublicUrl(p.storage_key) }))
  })

  const [dragOver, setDragOver] = useState<string | null>(null)

  function handleSlotClick(slotId: string) {
    pendingSlotRef.current = slotId
    fileInputRef.current?.click()
  }

  async function uploadFileToSlot(rawFile: File, slotId: string) {
    if (!rawFile.type.startsWith('image/') && !rawFile.name.toLowerCase().match(/\.(heic|heif)$/)) {
      toast.error('Only image files are supported')
      return
    }

    const file = await normalizeImage(rawFile)
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

  async function uploadDamagePhoto(rawFile: File) {
    if (!rawFile.type.startsWith('image/') && !rawFile.name.toLowerCase().match(/\.(heic|heif)$/)) {
      toast.error('Only image files are supported')
      return
    }

    const file = await normalizeImage(rawFile)
    const storageKey = buildStorageKey(listingId, file.name)
    const preview = URL.createObjectURL(file)
    const tempId = `uploading-${++tempIdCounter}`

    setDamagePhotos(prev => [...prev, { id: tempId, storageKey, url: preview, uploading: true }])

    const supabase = createClient()
    try {
      const { error: uploadError } = await supabase.storage
        .from('car-photos')
        .upload(storageKey, file, { contentType: file.type, cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: row, error: dbError } = await supabase
        .from('listing_photos')
        .insert({ listing_id: listingId, storage_key: storageKey, position: 0, slot_type: 'damage' })
        .select('id')
        .single()
      if (dbError) throw dbError

      setDamagePhotos(prev =>
        prev.map(p => p.id === tempId ? { id: row.id, storageKey, url: getPhotoPublicUrl(storageKey) } : p)
      )
    } catch {
      toast.error('Failed to upload damage photo')
      setDamagePhotos(prev => prev.filter(p => p.id !== tempId))
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const slotId = pendingSlotRef.current
    if (!file || !slotId) return
    e.target.value = ''
    await uploadFileToSlot(file, slotId)
  }

  async function handleDamageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    await Promise.allSettled(files.map(uploadDamagePhoto))
  }

  function handleDragOver(e: React.DragEvent, slotId: string) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(slotId)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
  }

  async function handleDrop(e: React.DragEvent, slotId: string) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await uploadFileToSlot(file, slotId)
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

  async function handleDeleteDamage(id: string, storageKey: string, e: React.MouseEvent) {
    e.stopPropagation()
    const supabase = createClient()
    try {
      await supabase.storage.from('car-photos').remove([storageKey])
      await supabase.from('listing_photos').delete().eq('id', id)
      setDamagePhotos(prev => prev.filter(p => p.id !== id))
    } catch {
      toast.error('Failed to delete photo')
    }
  }

  const uploadedCount = Object.keys(slotPhotos).length + damagePhotos.length

  return (
    <div className="space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={damageInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="hidden"
        onChange={handleDamageFileChange}
      />

      {PHOTO_SECTIONS.map(section => {
        const orderedSlots = [...section.slots]
          .filter(s => s.id !== 'damage')
          .sort((a, b) => (PHOTO_SLOT_ORDER[a.id] ?? 999) - (PHOTO_SLOT_ORDER[b.id] ?? 999))

        const hasDamage = section.slots.some(s => s.id === 'damage')

        return (
          <div key={section.id}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
              {section.title}
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {orderedSlots.map(slot => {
                const photo = slotPhotos[slot.id]
                const isOver = dragOver === slot.id
                return (
                  <div key={slot.id} className="group">
                    {photo ? (
                      <div
                        className="relative aspect-[4/3] overflow-hidden rounded-lg"
                        onDragOver={(e) => handleDragOver(e, slot.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, slot.id)}
                      >
                        <img src={photo.url} alt={slot.label} className="h-full w-full object-cover" />
                        {photo.uploading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(slot.id, e)}
                            className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 opacity-100"
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
                        onDragOver={(e) => handleDragOver(e, slot.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, slot.id)}
                        className={`flex aspect-[4/3] w-full flex-col items-center justify-center rounded-lg border border-dashed transition-colors ${
                          isOver
                            ? 'border-blue-400 bg-blue-50 text-blue-500'
                            : 'border-[#e7e5e4] bg-[#faf9f6] text-[#a8a29e] hover:border-[#a8a29e] hover:text-[#78716c]'
                        }`}
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    )}
                    <p className="mt-1 truncate text-center text-[10px] text-[#a8a29e]">{slot.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Damage multi-photo zone */}
            {hasDamage && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#a8a29e]">Damage Photos</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {damagePhotos.map(photo => (
                    <div key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg">
                      <img src={photo.url} alt="Damage" className="h-full w-full object-cover" />
                      {photo.uploading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDamage(photo.id, photo.storageKey, e)}
                          className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5"
                          aria-label="Remove damage photo"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => damageInputRef.current?.click()}
                    className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#e7e5e4] bg-[#faf9f6] text-[#a8a29e] hover:border-[#a8a29e] hover:text-[#78716c] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-[9px]">Add damage</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <p className="text-xs text-[#a8a29e]">
        {uploadedCount} {uploadedCount === 1 ? 'photo' : 'photos'} uploaded — all optional
      </p>
    </div>
  )
}
