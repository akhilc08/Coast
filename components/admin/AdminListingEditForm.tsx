'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminUpdateListingAction } from '@/app/actions/admin'

interface AdminListingEditFormProps {
  listingId: string
  initialData: {
    make: string | null
    model: string | null
    year: number | null
    mileage: number | null
    price_cents: number | null
    color: string | null
    condition_notes: string | null
    pickup_zip: string | null
    overall_grade: string | null
  }
}

export function AdminListingEditForm({ listingId, initialData }: AdminListingEditFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [fields, setFields] = useState({
    make: initialData.make ?? '',
    model: initialData.model ?? '',
    year: String(initialData.year ?? ''),
    mileage: String(initialData.mileage ?? ''),
    price: initialData.price_cents ? String(initialData.price_cents / 100) : '',
    color: initialData.color ?? '',
    condition_notes: initialData.condition_notes ?? '',
    pickup_zip: initialData.pickup_zip ?? '',
    overall_grade: initialData.overall_grade ?? '',
  })

  async function handleSave() {
    setError(null)
    setSuccess(false)
    setSaving(true)

    const price = parseFloat(fields.price)
    const year = parseInt(fields.year, 10)
    const mileage = parseInt(fields.mileage, 10)

    const result = await adminUpdateListingAction(listingId, {
      make: fields.make || undefined,
      model: fields.model || undefined,
      year: isNaN(year) ? undefined : year,
      mileage: isNaN(mileage) ? undefined : mileage,
      price_cents: isNaN(price) ? undefined : Math.round(price * 100),
      color: fields.color || undefined,
      condition_notes: fields.condition_notes || undefined,
      pickup_zip: fields.pickup_zip || undefined,
      overall_grade: fields.overall_grade || undefined,
    })

    setSaving(false)
    if ('error' in result) {
      setError(result.error)
    } else {
      setSuccess(true)
      router.refresh()
    }
  }

  const inputClass = 'w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-600 focus:outline-none'
  const labelClass = 'block text-xs font-medium text-[#78716c] mb-1'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Make</label>
          <input className={inputClass} value={fields.make} onChange={e => setFields(f => ({ ...f, make: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>Model</label>
          <input className={inputClass} value={fields.model} onChange={e => setFields(f => ({ ...f, model: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Year</label>
          <input type="number" className={inputClass} value={fields.year} onChange={e => setFields(f => ({ ...f, year: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>Mileage</label>
          <input type="number" className={inputClass} value={fields.mileage} onChange={e => setFields(f => ({ ...f, mileage: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Price (USD)</label>
          <input type="number" step="0.01" className={inputClass} value={fields.price} onChange={e => setFields(f => ({ ...f, price: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>Color</label>
          <input className={inputClass} value={fields.color} onChange={e => setFields(f => ({ ...f, color: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Pickup ZIP</label>
        <input className={inputClass} maxLength={5} value={fields.pickup_zip} onChange={e => setFields(f => ({ ...f, pickup_zip: e.target.value }))} />
      </div>

      <div>
        <label className={labelClass}>Grade</label>
        <select
          className={inputClass}
          value={fields.overall_grade}
          onChange={e => setFields(f => ({ ...f, overall_grade: e.target.value }))}
        >
          <option value="">— Not set —</option>
          {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'].map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Condition Notes</label>
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={fields.condition_notes}
          onChange={e => setFields(f => ({ ...f, condition_notes: e.target.value }))}
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
