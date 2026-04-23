'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitInspectionAction } from '@/app/actions/inspections'
import type { ConditionRating } from '@/lib/types/condition'

interface VinResult {
  id: string
  year: number
  make: string
  model: string
  status: string
  condition_locked: boolean
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-[#a8a29e] border-b border-[#e7e5e4] pb-2 mb-4">
      {children}
    </h3>
  )
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e] mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </p>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
    />
  )
}

const RATING_OPTIONS: { value: ConditionRating; label: string; active: string }[] = [
  { value: 'excellent', label: 'Excellent', active: 'bg-green-600 border-green-600 text-white' },
  { value: 'good',      label: 'Good',      active: 'bg-blue-600 border-blue-600 text-white' },
  { value: 'average',   label: 'Fair',      active: 'bg-yellow-500 border-yellow-500 text-white' },
  { value: 'bad',       label: 'Bad',       active: 'bg-red-500 border-red-500 text-white' },
]

function RatingButtons({ value, onChange }: { value: ConditionRating; onChange: (v: ConditionRating) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {RATING_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            value === opt.value
              ? opt.active
              : 'border-[#e7e5e4] text-[#78716c] hover:border-[#a8a29e] hover:text-[#1c1917]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function InspectionForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Vehicle info
  const [vin, setVin]                         = useState('')
  const [vinResult, setVinResult]             = useState<VinResult | null>(null)
  const [vinError, setVinError]               = useState<string | null>(null)
  const [vinLoading, setVinLoading]           = useState(false)
  const [inspectionDate, setInspectionDate]   = useState('')
  const [inspector, setInspector]             = useState('')
  const [mileage, setMileage]                 = useState('')

  // Exterior
  const [exteriorRating, setExteriorRating]   = useState<ConditionRating>('good')
  const [minorDefects, setMinorDefects]       = useState('')
  const [majorDefects, setMajorDefects]       = useState('')
  const [glassDamage, setGlassDamage]         = useState('')
  const [paintLow, setPaintLow]               = useState('')
  const [paintHigh, setPaintHigh]             = useState('')

  // Interior
  const [interiorRating, setInteriorRating]   = useState<ConditionRating>('good')
  const [seatWear, setSeatWear]               = useState('none')
  const [odor, setOdor]                       = useState('none')
  const [climateControl, setClimateControl]   = useState(true)
  const [interiorDamage, setInteriorDamage]   = useState('')

  // Mechanical
  const [mechRating, setMechRating]           = useState<ConditionRating>('good')
  const [engineNoises, setEngineNoises]       = useState('')
  const [obdiiCodes, setObdiiCodes]           = useState('')
  const [fluidLeaks, setFluidLeaks]           = useState('')
  const [driveNotes, setDriveNotes]           = useState('')

  // Tires
  const [tiresRating, setTiresRating]         = useState<ConditionRating>('good')
  const [treadFl, setTreadFl]                 = useState('')
  const [treadFr, setTreadFr]                 = useState('')
  const [treadRl, setTreadRl]                 = useState('')
  const [treadRr, setTreadRr]                 = useState('')
  const [wheelDamage, setWheelDamage]         = useState('')

  const [error, setError]                     = useState<string | null>(null)

  // VIN lookup — fires when VIN reaches 17 chars
  useEffect(() => {
    const normalized = vin.trim().toUpperCase()
    if (normalized.length !== 17) {
      setVinResult(null)
      setVinError(null)
      return
    }
    setVinLoading(true)
    setVinError(null)
    fetch(`/api/listings/vin?vin=${encodeURIComponent(normalized)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setVinResult(null)
          setVinError(data.error)
        } else {
          setVinResult(data)
          setVinError(null)
        }
      })
      .catch(() => setVinError('Lookup failed'))
      .finally(() => setVinLoading(false))
  }, [vin])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vinResult) { setError('Please enter a valid VIN first.'); return }
    setError(null)

    startTransition(async () => {
      const result = await submitInspectionAction({
        vin,
        inspectionDate,
        inspectionProvider: inspector,
        mileage,
        exteriorRating,
        minorBodyDefects: minorDefects,
        majorBodyDefects: majorDefects,
        glassDamage,
        paintLow,
        paintHigh,
        interiorRating,
        seatWear,
        odor,
        climateControl,
        interiorDamage,
        mechanicalRating: mechRating,
        engineNoises,
        obdiiCodes,
        fluidLeaks,
        driveNotes,
        tiresRating,
        treadFl,
        treadFr,
        treadRl,
        treadRr,
        wheelDamage,
      })

      if ('error' in result) {
        setError(result.error)
      } else {
        router.push(`/admin/inspections/${result.listing_id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── VEHICLE INFO ── */}
      <div>
        <SectionHeading>Vehicle Info</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label required>VIN Number</Label>
            <Input
              value={vin}
              onChange={v => setVin(v)}
              placeholder="17-character VIN"
            />
            {vinLoading && (
              <p className="mt-1.5 text-xs text-[#a8a29e]">Looking up…</p>
            )}
            {vinResult && (
              <div className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 flex items-center gap-2">
                <span className="text-green-600 text-sm">✓</span>
                <p className="text-sm font-medium text-green-800">
                  {vinResult.year} {vinResult.make} {vinResult.model}
                </p>
                {vinResult.condition_locked && (
                  <span className="ml-auto text-xs text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-full px-2 py-0.5">
                    Will overwrite existing report
                  </span>
                )}
              </div>
            )}
            {vinError && (
              <p className="mt-1.5 text-xs text-red-500">{vinError}</p>
            )}
          </div>

          <div>
            <Label>Inspection Date</Label>
            <Input type="date" value={inspectionDate} onChange={setInspectionDate} />
          </div>
          <div>
            <Label>Inspector / Provider</Label>
            <Input value={inspector} onChange={setInspector} placeholder="e.g. John Smith" />
          </div>
          <div>
            <Label>Mileage</Label>
            <Input type="number" value={mileage} onChange={setMileage} placeholder="e.g. 45000" />
          </div>
        </div>
      </div>

      {/* ── EXTERIOR ── */}
      <div>
        <SectionHeading>Exterior</SectionHeading>
        <div className="space-y-4">
          <div>
            <Label required>Rating</Label>
            <RatingButtons value={exteriorRating} onChange={setExteriorRating} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minor Body Defects</Label>
              <Textarea value={minorDefects} onChange={setMinorDefects} placeholder="Describe minor defects…" />
            </div>
            <div>
              <Label>Major Body Defects</Label>
              <Textarea value={majorDefects} onChange={setMajorDefects} placeholder="Describe major defects…" />
            </div>
            <div>
              <Label>Glass Damage</Label>
              <Textarea value={glassDamage} onChange={setGlassDamage} placeholder="Chips, cracks…" rows={2} />
            </div>
            <div>
              <Label>Paint Meter Readings (µm)</Label>
              <div className="flex gap-2">
                <Input value={paintLow} onChange={setPaintLow} placeholder="Low" type="number" />
                <Input value={paintHigh} onChange={setPaintHigh} placeholder="High" type="number" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── INTERIOR ── */}
      <div>
        <SectionHeading>Interior</SectionHeading>
        <div className="space-y-4">
          <div>
            <Label required>Rating</Label>
            <RatingButtons value={interiorRating} onChange={setInteriorRating} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Seat Wear</Label>
              <select
                value={seatWear}
                onChange={e => setSeatWear(e.target.value)}
                className="w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>
            <div>
              <Label>Odor</Label>
              <select
                value={odor}
                onChange={e => setOdor(e.target.value)}
                className="w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="smoke">Smoke</option>
                <option value="mold_mildew">Mold / Mildew</option>
                <option value="burnt">Burnt</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label>Climate Control</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={climateControl}
                  onChange={e => setClimateControl(e.target.checked)}
                  className="h-4 w-4 rounded border-[#e7e5e4]"
                />
                <span className="text-sm text-[#1c1917]">AC / Heat working</span>
              </label>
            </div>
            <div className="col-span-2">
              <Label>Interior Damage</Label>
              <Textarea value={interiorDamage} onChange={setInteriorDamage} placeholder="Describe any interior damage…" />
            </div>
          </div>
        </div>
      </div>

      {/* ── MECHANICAL ── */}
      <div>
        <SectionHeading>Mechanical</SectionHeading>
        <div className="space-y-4">
          <div>
            <Label required>Rating</Label>
            <RatingButtons value={mechRating} onChange={setMechRating} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Abnormal Engine Noises</Label>
              <Textarea value={engineNoises} onChange={setEngineNoises} placeholder="Describe any noises…" rows={2} />
            </div>
            <div>
              <Label>OBDII Codes</Label>
              <Textarea value={obdiiCodes} onChange={setObdiiCodes} placeholder="e.g. P0420, P0300" rows={2} />
            </div>
            <div>
              <Label>Fluid Leaks</Label>
              <Textarea value={fluidLeaks} onChange={setFluidLeaks} placeholder="e.g. Oil — minor, Coolant — none" rows={2} />
            </div>
            <div>
              <Label>Test Drive Notes</Label>
              <Textarea value={driveNotes} onChange={setDriveNotes} placeholder="Suspension, transmission, brakes…" rows={2} />
            </div>
          </div>
        </div>
      </div>

      {/* ── TIRES & WHEELS ── */}
      <div>
        <SectionHeading>Tires &amp; Wheels</SectionHeading>
        <div className="space-y-4">
          <div>
            <Label required>Rating</Label>
            <RatingButtons value={tiresRating} onChange={setTiresRating} />
          </div>
          <div>
            <Label>Tread Depth (mm)</Label>
            <div className="grid grid-cols-4 gap-2">
              {([['Front Left', treadFl, setTreadFl], ['Front Right', treadFr, setTreadFr], ['Rear Left', treadRl, setTreadRl], ['Rear Right', treadRr, setTreadRr]] as const).map(([label, val, set]) => (
                <div key={label}>
                  <p className="text-[10px] text-[#a8a29e] mb-1">{label}</p>
                  <input
                    type="number"
                    step="0.1"
                    value={val}
                    onChange={e => set(e.target.value)}
                    placeholder="mm"
                    className="w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Wheel / Rim Damage</Label>
            <Textarea value={wheelDamage} onChange={setWheelDamage} placeholder="Describe any damage…" rows={2} />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !vinResult}
        className="w-full rounded-lg bg-[#1d4ed8] py-3 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Saving…' : 'Submit Inspection Report'}
      </button>
    </form>
  )
}
