'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, rectSortingStrategy,
} from '@dnd-kit/sortable'
import { SortablePhoto } from './SortablePhoto'
import { buildStorageKey } from '@/lib/storage'
import { createClient } from '@/lib/supabase/browser'
import { toast } from 'sonner'

export interface PhotoItem {
  id: string
  storageKey: string
  url: string
  position: number
  uploading?: boolean
}

interface PhotoUploadZoneProps {
  listingId: string
  initialPhotos: { id: string; storage_key: string; position: number }[]
  onChange: (photos: PhotoItem[]) => void
}

export function PhotoUploadZone({ listingId, initialPhotos, onChange }: PhotoUploadZoneProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    const supabase = createClient()
    return initialPhotos
      .sort((a, b) => a.position - b.position)
      .map(p => ({
        id: p.id,
        storageKey: p.storage_key,
        url: supabase.storage.from('car-photos').getPublicUrl(p.storage_key).data.publicUrl,
        position: p.position,
      }))
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  )

  const updatePhotos = useCallback((next: PhotoItem[]) => {
    const withPositions = next.map((p, i) => ({ ...p, position: i }))
    setPhotos(withPositions)
    onChange(withPositions)
  }, [onChange])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = photos.findIndex(p => p.id === active.id)
      const newIdx = photos.findIndex(p => p.id === over.id)
      updatePhotos(arrayMove(photos, oldIdx, newIdx))
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const supabase = createClient()
    const existing = photos.filter(p => !p.uploading).length
    const remaining = 20 - existing
    const toUpload = acceptedFiles.slice(0, remaining)

    for (const file of toUpload) {
      const storageKey = buildStorageKey(listingId, file.name)
      const tempId = `temp-${crypto.randomUUID()}`
      const preview = URL.createObjectURL(file)

      setPhotos(prev => [...prev, { id: tempId, storageKey, url: preview, position: prev.length, uploading: true }])

      try {
        const { error } = await supabase.storage
          .from('car-photos')
          .upload(storageKey, file, { contentType: file.type, cacheControl: '3600', upsert: false })
        if (error) throw error

        const { data: urlData } = supabase.storage.from('car-photos').getPublicUrl(storageKey)

        const { data: row, error: dbError } = await supabase
          .from('listing_photos')
          .insert({ listing_id: listingId, storage_key: storageKey, position: existing })
          .select('id')
          .single()
        if (dbError) throw dbError

        setPhotos(prev => prev.map(p =>
          p.id === tempId ? { id: row.id, storageKey, url: urlData.publicUrl, position: p.position } : p
        ))
      } catch {
        toast.error(`Failed to upload ${file.name}`)
        setPhotos(prev => prev.filter(p => p.id !== tempId))
      }
    }
  }, [listingId, photos])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxFiles: 20,
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    onDrop,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
          isDragActive ? 'border-blue-500 bg-blue-950/20' : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-zinc-400">
          {isDragActive ? 'Drop photos here' : 'Drag & drop photos, or click to select'}
        </p>
        <p className="mt-1 text-xs text-zinc-600">JPEG, PNG, WebP — max 10MB each, up to 20 photos</p>
      </div>

      <p className="text-xs text-zinc-500">{photos.filter(p => !p.uploading).length} / 20 photos — drag to reorder — first photo is the hero</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {photos.map((photo, i) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                isHero={i === 0}
                onDelete={(id) => {
                  const next = photos.filter(p => p.id !== id)
                  updatePhotos(next)
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
