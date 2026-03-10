'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface PhotoItem {
  id: string
  storageKey: string
  url: string
  position: number
  uploading?: boolean
}

interface SortablePhotoProps {
  photo: PhotoItem
  isHero: boolean
  onDelete: (id: string) => void
}

export function SortablePhoto({ photo, isHero, onDelete }: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative aspect-square cursor-grab rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt="Listing photo"
        className="h-full w-full object-cover"
      />
      {photo.uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/70">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-blue-500" />
        </div>
      )}
      {isHero && !photo.uploading && (
        <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">
          Hero
        </span>
      )}
      {!photo.uploading && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }}
          className="absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-0.5 text-zinc-300 hover:bg-red-900/80 hover:text-red-300 group-hover:flex"
          aria-label="Delete photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
