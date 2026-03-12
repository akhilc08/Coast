'use client'

import { useState } from 'react'

interface StarPickerProps {
  value: number
  onChange: (rating: number) => void
}

export function StarPicker({ value, onChange }: StarPickerProps) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div className="flex gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={value === n}
          className={`text-2xl transition-colors ${n <= active ? 'text-[#ca8a04]' : 'text-[#d6d3d1]'} hover:text-[#ca8a04]`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
        >
          ★
        </button>
      ))}
    </div>
  )
}
