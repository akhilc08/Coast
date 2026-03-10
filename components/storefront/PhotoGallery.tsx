'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useState } from 'react'
import 'yet-another-react-lightbox/styles.css'

const Lightbox = dynamic(() => import('yet-another-react-lightbox'), { ssr: false })

interface Photo {
  url: string
  storageKey: string
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen]   = useState(false)
  const [index, setIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl bg-zinc-900 text-sm text-zinc-600">
        No photos available
      </div>
    )
  }

  const slides = photos.map(p => ({ src: p.url }))

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
              alt={`Vehicle photo ${i + 1}`}
              fill
              className="object-cover transition-opacity hover:opacity-90"
              sizes={i === 0 ? '100vw' : '33vw'}
            />
            {i === 0 && (
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                {photos.length} photos
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
      />
    </>
  )
}
