'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Loader2, X, AlertTriangle, GripVertical } from 'lucide-react'
import { buildStorageKey, getPhotoPublicUrl } from '@/lib/storage'
import { createClient } from '@/lib/supabase/browser'
import { toast } from 'sonner'

const CATEGORY_LABELS: Record<string, string> = {
  exterior_front: 'Exterior — Front',
  exterior_rear: 'Exterior — Rear',
  exterior_side: 'Exterior — Side',
  interior_dashboard: 'Interior — Dashboard',
  interior_seats: 'Interior — Seats',
  engine: 'Engine',
  wheels: 'Wheels',
  damage: 'Damage',
  other: 'Other',
}

const REQUIRED_CATEGORIES = ['exterior_front', 'interior_dashboard']

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS)

interface UploadedPhoto {
  id: string
  storageKey: string
  url: string
  category: string
  uploading?: boolean
}

interface InitialPhoto {
  id: string
  storage_key: string
  position: number
  slot_type: string | null
}

interface BulkPhotoUploadProps {
  listingId: string
  initialPhotos: InitialPhoto[]
}

export function BulkPhotoUpload({ listingId, initialPhotos }: BulkPhotoUploadProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(() =>
    initialPhotos.map(p => ({
      id: p.id,
      storageKey: p.storage_key,
      url: getPhotoPublicUrl(p.storage_key),
      category: p.slot_type ?? 'other',
    }))
  )
  const [organizing, setOrganizing] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const supabase = createClient()
    const remaining = 20 - photos.filter(p => !p.uploading).length
    const toUpload = acceptedFiles.slice(0, remaining)

    // Create temporary entries
    const tempPhotos: UploadedPhoto[] = toUpload.map(file => ({
      id: `temp-${crypto.randomUUID()}`,
      storageKey: buildStorageKey(listingId, file.name),
      url: URL.createObjectURL(file),
      category: 'other',
      uploading: true,
    }))

    setPhotos(prev => [...prev, ...tempPhotos])

    // Upload all files
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]
      const temp = tempPhotos[i]

      try {
        const { error: uploadError } = await supabase.storage
          .from('car-photos')
          .upload(temp.storageKey, file, { contentType: file.type, cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError

        const { data: row, error: dbError } = await supabase
          .from('listing_photos')
          .insert({ listing_id: listingId, storage_key: temp.storageKey, position: photos.length + i, slot_type: 'other' })
          .select('id')
          .single()
        if (dbError) throw dbError

        setPhotos(prev => prev.map(p =>
          p.id === temp.id
            ? { ...p, id: row.id, url: getPhotoPublicUrl(temp.storageKey), uploading: false }
            : p
        ))
      } catch {
        toast.error(`Failed to upload ${file.name}`)
        setPhotos(prev => prev.filter(p => p.id !== temp.id))
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

  async function handleOrganize() {
    const uploadedPhotos = photos.filter(p => !p.uploading)
    if (uploadedPhotos.length === 0) {
      toast.error('Upload some photos first')
      return
    }

    setOrganizing(true)
    try {
      const res = await fetch('/api/listings/organize-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: uploadedPhotos.map(p => ({
            id: p.id,
            url: p.url,
          })),
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Organization failed')
      }

      const { results } = await res.json() as { results: { id: string; category: string }[] }

      // Update categories in state
      setPhotos(prev => prev.map(p => {
        const match = results.find(r => r.id === p.id)
        return match ? { ...p, category: match.category } : p
      }))

      // Update slot_type in DB
      const supabase = createClient()
      for (const result of results) {
        await supabase
          .from('listing_photos')
          .update({ slot_type: result.category })
          .eq('id', result.id)
      }

      toast.success('Photos organized by AI')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to organize photos')
    } finally {
      setOrganizing(false)
    }
  }

  async function handleDelete(photoId: string) {
    const photo = photos.find(p => p.id === photoId)
    if (!photo || photo.uploading) return

    const supabase = createClient()
    try {
      await supabase.storage.from('car-photos').remove([photo.storageKey])
      await supabase.from('listing_photos').delete().eq('id', photo.id)
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } catch {
      toast.error('Failed to delete photo')
    }
  }

  function handleCategoryChange(photoId: string, category: string) {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, category } : p))
    // Update in DB
    const supabase = createClient()
    supabase.from('listing_photos').update({ slot_type: category }).eq('id', photoId).then()
  }

  // Group photos by category
  const grouped = ALL_CATEGORIES.reduce((acc, cat) => {
    const catPhotos = photos.filter(p => p.category === cat)
    if (catPhotos.length > 0) acc[cat] = catPhotos
    return acc
  }, {} as Record<string, UploadedPhoto[]>)

  // Check for missing required categories
  const missingRequired = REQUIRED_CATEGORIES.filter(cat => !grouped[cat] || grouped[cat].length === 0)
  const uploadedCount = photos.filter(p => !p.uploading).length

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-[#e7e5e4] hover:border-[#a8a29e]'
        }`}
      >
        <input {...getInputProps()} />
        <Camera className="mx-auto mb-2 h-6 w-6 text-[#a8a29e]" />
        <p className="text-sm text-[#78716c]">
          {isDragActive ? 'Drop photos here' : 'Drag & drop photos, or click to select multiple'}
        </p>
        <p className="mt-1 text-xs text-[#a8a29e]">JPEG, PNG, WebP — max 10MB each, up to 20 photos</p>
      </div>

      {/* Organize button */}
      {uploadedCount > 0 && (
        <button
          type="button"
          onClick={handleOrganize}
          disabled={organizing}
          className="w-full rounded-lg bg-[#f5f5f4] px-4 py-2.5 text-sm font-medium text-[#1c1917] transition-colors hover:bg-[#e7e5e4] disabled:opacity-50"
        >
          {organizing ? (
            <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Organizing with AI...</span>
          ) : (
            `Organize ${uploadedCount} photos with AI`
          )}
        </button>
      )}

      {/* Missing categories warning */}
      {uploadedCount > 0 && missingRequired.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-yellow-800">Missing important photos</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              {missingRequired.map(cat => CATEGORY_LABELS[cat]).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Organized photo groups */}
      {Object.entries(grouped).map(([category, catPhotos]) => (
        <div key={category}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
            {CATEGORY_LABELS[category] ?? category} ({catPhotos.length})
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {catPhotos.map(photo => (
              <div key={photo.id} className="group relative">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#f5f5f4]">
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  {photo.uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDelete(photo.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
                {!photo.uploading && (
                  <select
                    value={photo.category}
                    onChange={e => handleCategoryChange(photo.id, e.target.value)}
                    className="mt-1 w-full rounded border border-[#e7e5e4] bg-white px-1.5 py-0.5 text-[10px] text-[#78716c]"
                  >
                    {ALL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Ungrouped photos (before organization) */}
      {photos.length > 0 && Object.keys(grouped).length === 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map(photo => (
            <div key={photo.id} className="group relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#f5f5f4]">
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
                {photo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#a8a29e]">
        {uploadedCount} / 20 photos uploaded
      </p>
    </div>
  )
}
