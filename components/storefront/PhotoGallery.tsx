'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useState } from 'react'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { PHOTO_SECTIONS } from '@/lib/photo-slots'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import { Images, ChevronLeft, ChevronRight } from 'lucide-react'

const Lightbox = dynamic(() => import('yet-another-react-lightbox'), { ssr: false })

const SLOT_LABEL: Record<string, string> = Object.fromEntries(
  PHOTO_SECTIONS.flatMap(s => s.slots.map(slot => [slot.id, `${s.title} — ${slot.label}`]))
)

interface Photo {
  url: string
  storageKey: string
  slotType?: string | null
}

const THUMB_COUNT = 4

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroOpacity, setHeroOpacity] = useState(1)
  const [open, setOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  function changeHero(newIndex: number) {
    setHeroOpacity(0)
    setTimeout(() => {
      setHeroIndex(newIndex)
      setHeroOpacity(1)
    }, 150)
  }

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

  function openLightbox(i: number) { setLightboxIndex(i); setOpen(true) }

  const hero = photos[heroIndex]
  const thumbs = photos.slice(0, THUMB_COUNT + 1).filter((_, i) => i !== heroIndex).slice(0, THUMB_COUNT)
  const remaining = photos.length - 1 - THUMB_COUNT

  function prev(e: React.MouseEvent) {
    e.stopPropagation()
    changeHero(Math.max(0, heroIndex - 1))
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation()
    changeHero(Math.min(photos.length - 1, heroIndex + 1))
  }

  return (
    <>
      <div className="space-y-1.5">
        {/* Hero with arrows */}
        <div className="group relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '16/9' }}>
          <button
            onClick={() => openLightbox(heroIndex)}
            className="absolute inset-0 cursor-zoom-in"
            style={{ opacity: heroOpacity, transition: 'opacity 0.15s ease' }}
          >
            <Image
              src={hero.url}
              alt={hero.slotType ? (SLOT_LABEL[hero.slotType] ?? hero.slotType) : 'Vehicle photo'}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          </button>

          {/* Slot label */}
          {hero.slotType && (
            <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {SLOT_LABEL[hero.slotType]?.split(' — ')[1] ?? hero.slotType.replace(/_/g, ' ')}
            </span>
          )}

          {/* Photo counter */}
          <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
            {heroIndex + 1} / {photos.length}
          </span>

          {/* Prev arrow */}
          {heroIndex > 0 && (
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5 text-[#1c1917]" />
            </button>
          )}

          {/* Next arrow */}
          {heroIndex < photos.length - 1 && (
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronRight className="h-5 w-5 text-[#1c1917]" />
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(photos.length - 1, THUMB_COUNT) + (remaining > 0 ? 1 : 0)}, 1fr)` }}
          >
            {thumbs.map((photo, i) => {
              const originalIndex = photos.indexOf(photo)
              return (
                <button
                  key={originalIndex}
                  onClick={() => changeHero(originalIndex)}
                  className={`relative overflow-hidden rounded-lg cursor-pointer transition-opacity ${heroIndex === originalIndex ? 'ring-2 ring-blue-500' : 'hover:opacity-90'}`}
                  style={{ aspectRatio: '4/3' }}
                >
                  <Image
                    src={photo.url}
                    alt={photo.slotType ? (SLOT_LABEL[photo.slotType] ?? photo.slotType) : `Photo ${originalIndex + 1}`}
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />
                  {photo.slotType && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white leading-tight">
                      {SLOT_LABEL[photo.slotType]?.split(' — ')[1] ?? photo.slotType.replace(/_/g, ' ')}
                    </span>
                  )}
                </button>
              )
            })}

            {remaining > 0 && (
              <button
                onClick={() => openLightbox(THUMB_COUNT + 1)}
                className="relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-[#1c1917] cursor-pointer hover:bg-[#292524] transition-colors"
                style={{ aspectRatio: '4/3' }}
              >
                <Images className="h-5 w-5 text-white/80" />
                <span className="text-sm font-semibold text-white">+{remaining} more</span>
              </button>
            )}
          </div>
        )}

        <p className="text-right text-xs text-[#a8a29e]">
          <button onClick={() => openLightbox(0)} className="hover:text-[#78716c] transition-colors">
            View all {photos.length} photos
          </button>
        </p>
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={lightboxIndex}
        slides={slides}
        plugins={[Captions, Zoom]}
        carousel={{ finite: true }}
        zoom={{ maxZoomPixelRatio: 3, zoomInMultiplier: 2, doubleTapDelay: 300, doubleClickDelay: 300 }}
        captions={{ showToggle: false, descriptionTextAlign: 'center' }}
      />
    </>
  )
}
