'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useState } from 'react'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { PHOTO_SECTIONS } from '@/lib/photo-slots'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

const Lightbox = dynamic(() => import('yet-another-react-lightbox'), { ssr: false })

const SLOT_LABEL: Record<string, string> = Object.fromEntries(
  PHOTO_SECTIONS.flatMap(s => s.slots.map(slot => [slot.id, `${s.title} — ${slot.label}`]))
)

interface Photo {
  url: string
  storageKey: string
  slotType?: string | null
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen]   = useState(false)
  const [index, setIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl bg-[#f5f5f4] text-sm text-[#a8a29e]">
        No photos available
      </div>
    )
  }

  const slides = photos.map(p => ({
    src: p.url,
    title: p.slotType ? SLOT_LABEL[p.slotType] ?? p.slotType.replace(/_/g, ' ') : undefined,
  }))

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <button
            key={i}
            onClick={() => { setIndex(i); setOpen(true) }}
            className={`relative overflow-hidden rounded-lg ${i === 0 ? 'col-span-3 h-64' : 'h-28'} cursor-zoom-in`}
          >
            <Image
              src={photo.url}
              alt={photo.slotType ? (SLOT_LABEL[photo.slotType] ?? photo.slotType) : `Vehicle photo ${i + 1}`}
              fill
              className="object-cover transition-opacity hover:opacity-90"
              sizes={i === 0 ? '100vw' : '33vw'}
            />
            {i === 0 && (
              <span className="absolute left-2 top-2 rounded-full bg-[#1c1917]/70 px-2 py-0.5 text-xs text-white">
                {photos.length} photos
              </span>
            )}
            {photo.slotType && (
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white leading-tight">
                {SLOT_LABEL[photo.slotType]?.split(' — ')[1] ?? photo.slotType.replace(/_/g, ' ')}
              </span>
            )}
          </button>
        ))}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
        plugins={[Captions, Zoom]}
        zoom={{ maxZoomPixelRatio: 3, zoomInMultiplier: 2, doubleTapDelay: 300, doubleClickDelay: 300 }}
        captions={{ showToggle: false, descriptionTextAlign: 'center' }}
      />
    </>
  )
}
