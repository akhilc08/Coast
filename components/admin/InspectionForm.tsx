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

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className={`rounded-xl border border-[#e7e5e4] bg-white overflow-hidden`}>
      {accent && <div className={`h-2 ${accent}`} />}
      <div className="p-8">{children}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-[#1c1917] mb-1">{children}</h2>
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#78716c] mb-6">{children}</p>
}

function Question({ label, required, hint, children }: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-7">
      <label className="block text-[15px] font-medium text-[#1c1917] mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-[#a8a29e] mb-2">{hint}</p>}
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-4 py-3 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1d4ed8] focus:bg-white transition-colors"
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
      className="w-full rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-4 py-3 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1d4ed8] focus:bg-white transition-colors resize-none"
    />
  )
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-4 py-3 text-sm text-[#1c1917] focus:outline-none focus:border-[#1d4ed8] focus:bg-white transition-colors"
    >
      {children}
    </select>
  )
}

const RATINGS: { value: ConditionRating; label: string; desc: string; color: string }[] = [
  { value: 'excellent', label: 'Excellent', desc: 'Like new, no notable issues',         color: 'border-green-500 bg-green-50 text-green-800' },
  { value: 'good',      label: 'Good',      desc: 'Minor wear, no significant issues',   color: 'border-blue-500 bg-blue-50 text-blue-800' },
  { value: 'average',   label: 'Fair',      desc: 'Noticeable wear or minor issues',     color: 'border-yellow-500 bg-yellow-50 text-yellow-800' },
  { value: 'bad',       label: 'Bad',       desc: 'Significant issues requiring repair', color: 'border-red-500 bg-red-50 text-red-800' },
]

function RatingPicker({ value, onChange }: { value: ConditionRating; onChange: (v: ConditionRating) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {RATINGS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            value === opt.value
              ? opt.color + ' border-current'
              : 'border-[#e7e5e4] bg-white text-[#78716c] hover:border-[#a8a29e]'
          }`}
        >
          <p className="font-semibold text-sm">{opt.label}</p>
          <p className="text-xs mt-0.5 leading-snug opacity-75">{opt.desc}</p>
        </button>
      ))}
    </div>
  )
}

export function InspectionForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [vin, setVin]                         = useState('')
  const [vinResult, setVinResult]             = useState<VinResult | null>(null)
  const [vinError, setVinError]               = useState<string | null>(null)
  const [vinLoading, setVinLoading]           = useState(false)
  const [inspectionDate, setInspectionDate]   = useState('')
  const [inspector, setInspector]             = useState('')
  const [mileage, setMileage]                 = useState('')

  const [exteriorRating, setExteriorRating]   = useState<ConditionRating>('good')
  const [minorDefects, setMinorDefects]       = useState('')
  const [majorDefects, setMajorDefects]       = useState('')
  const [glassDamage, setGlassDamage]         = useState('')
  const [paintLow, setPaintLow]               = useState('')
  const [paintHigh, setPaintHigh]             = useState('')

  const [interiorRating, setInteriorRating]   = useState<ConditionRating>('good')
  const [seatWear, setSeatWear]               = useState('none')
  const [odor, setOdor]                       = useState('none')
  const [climateControl, setClimateControl]   = useState(true)
  const [interiorDamage, setInteriorDamage]   = useState('')

  const [mechRating, setMechRating]           = useState<ConditionRating>('good')
  const [engineNoises, setEngineNoises]       = useState('')
  const [obdiiCodes, setObdiiCodes]           = useState('')
  const [fluidLeaks, setFluidLeaks]           = useState('')
  const [driveNotes, setDriveNotes]           = useState('')

  const [tiresRating, setTiresRating]         = useState<ConditionRating>('good')
  const [treadFl, setTreadFl]                 = useState('')
  const [treadFr, setTreadFr]                 = useState('')
  const [treadRl, setTreadRl]                 = useState('')
  const [treadRr, setTreadRr]                 = useState('')
  const [wheelDamage, setWheelDamage]         = useState('')

  const [error, setError]                     = useState<string | null>(null)

  useEffect(() => {
    const normalized = vin.trim().toUpperCase()
    if (normalized.length !== 17) { setVinResult(null); setVinError(null); return }
    setVinLoading(true); setVinError(null)
    fetch(`/api/listings/vin?vin=${encodeURIComponent(normalized)}`)
      .then(r => r.json())
      .then(data => { data.error ? (setVinResult(null), setVinError(data.error)) : (setVinResult(data), setVinError(null)) })
      .catch(() => setVinError('Lookup failed'))
      .finally(() => setVinLoading(false))
  }, [vin])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vinResult) { setError('Please enter a valid VIN first.'); return }
    setError(null)
    startTransition(async () => {
      const result = await submitInspectionAction({
        vin, inspectionDate, inspectionProvider: inspector, mileage,
        exteriorRating, minorBodyDefects: minorDefects, majorBodyDefects: majorDefects,
        glassDamage, paintLow, paintHigh,
        interiorRating, seatWear, odor, climateControl, interiorDamage,
        mechanicalRating: mechRating, engineNoises, obdiiCodes, fluidLeaks, driveNotes,
        tiresRating, treadFl, treadFr, treadRl, treadRr, wheelDamage,
      })
      if ('error' in result) setError(result.error)
      else router.push(`/admin/inspections/${result.listing_id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── VEHICLE INFO ── */}
      <Card accent="bg-[#1d4ed8]">
        <SectionTitle>Vehicle Information</SectionTitle>
        <SectionSubtitle>Enter the VIN to identify the vehicle being inspected.</SectionSubtitle>

        <Question label="VIN Number" required>
          <TextInput value={vin} onChange={setVin} placeholder="Enter 17-character VIN" />
          {vinLoading && <p className="mt-2 text-xs text-[#a8a29e]">Looking up vehicle…</p>}
          {vinResult && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-semibold text-green-800">
                ✓ {vinResult.year} {vinResult.make} {vinResult.model}
              </p>
              {vinResult.condition_locked && (
                <p className="text-xs text-yellow-700 mt-1">⚠ This listing already has a report — submitting will overwrite it.</p>
              )}
            </div>
          )}
          {vinError && <p className="mt-2 text-xs text-red-500">✗ {vinError}</p>}
        </Question>

        <Question label="Inspection Date">
          <TextInput type="date" value={inspectionDate} onChange={setInspectionDate} />
        </Question>

        <Question label="Inspector / Provider">
          <TextInput value={inspector} onChange={setInspector} placeholder="e.g. John Smith" />
        </Question>

        <Question label="Mileage at Inspection">
          <TextInput type="number" value={mileage} onChange={setMileage} placeholder="e.g. 45000" />
        </Question>
      </Card>

      {/* ── EXTERIOR ── */}
      <Card accent="bg-emerald-500">
        <SectionTitle>Exterior</SectionTitle>
        <SectionSubtitle>Assess the outside of the vehicle.</SectionSubtitle>

        <Question label="Overall Exterior Rating" required>
          <RatingPicker value={exteriorRating} onChange={setExteriorRating} />
        </Question>

        <Question label="Minor Body Defects" hint="Scratches, small dings, light scuffs">
          <Textarea value={minorDefects} onChange={setMinorDefects} placeholder="Describe any minor defects, or leave blank if none…" />
        </Question>

        <Question label="Major Body Defects" hint="Dents, deep scratches, rust, panel damage">
          <Textarea value={majorDefects} onChange={setMajorDefects} placeholder="Describe any major defects, or leave blank if none…" />
        </Question>

        <Question label="Glass Damage" hint="Chips, cracks, or scratches on windows or windshield">
          <Textarea value={glassDamage} onChange={setGlassDamage} placeholder="Describe any glass damage, or leave blank if none…" rows={2} />
        </Question>

        <Question label="Paint Meter Readings (µm)" hint="Enter the low and high readings from your paint meter">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-[#a8a29e] mb-1">Low</p>
              <TextInput type="number" value={paintLow} onChange={setPaintLow} placeholder="e.g. 110" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#a8a29e] mb-1">High</p>
              <TextInput type="number" value={paintHigh} onChange={setPaintHigh} placeholder="e.g. 180" />
            </div>
          </div>
        </Question>
      </Card>

      {/* ── INTERIOR ── */}
      <Card accent="bg-purple-500">
        <SectionTitle>Interior</SectionTitle>
        <SectionSubtitle>Assess the inside of the vehicle.</SectionSubtitle>

        <Question label="Overall Interior Rating" required>
          <RatingPicker value={interiorRating} onChange={setInteriorRating} />
        </Question>

        <Question label="Seat Wear">
          <Select value={seatWear} onChange={setSeatWear}>
            <option value="none">None — seats are in good condition</option>
            <option value="minor">Minor — light surface wear</option>
            <option value="moderate">Moderate — visible wear or small tears</option>
            <option value="severe">Severe — significant damage or tears</option>
          </Select>
        </Question>

        <Question label="Odor">
          <Select value={odor} onChange={setOdor}>
            <option value="none">No odor</option>
            <option value="smoke">Smoke</option>
            <option value="mold_mildew">Mold / Mildew</option>
            <option value="burnt">Burnt</option>
            <option value="other">Other</option>
          </Select>
        </Question>

        <Question label="Climate Control (AC / Heat)">
          <div className="flex gap-4">
            {[true, false].map(v => (
              <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={climateControl === v}
                  onChange={() => setClimateControl(v)}
                  className="h-4 w-4 accent-[#1d4ed8]"
                />
                <span className="text-sm text-[#1c1917]">{v ? 'Working' : 'Not working'}</span>
              </label>
            ))}
          </div>
        </Question>

        <Question label="Interior Damage Notes" hint="Describe any trim damage, cosmetic issues, or missing items">
          <Textarea value={interiorDamage} onChange={setInteriorDamage} placeholder="Describe any interior damage, or leave blank if none…" />
        </Question>
      </Card>

      {/* ── MECHANICAL ── */}
      <Card accent="bg-orange-500">
        <SectionTitle>Mechanical</SectionTitle>
        <SectionSubtitle>Document the mechanical condition of the vehicle.</SectionSubtitle>

        <Question label="Overall Mechanical Rating" required>
          <RatingPicker value={mechRating} onChange={setMechRating} />
        </Question>

        <Question label="Abnormal Engine Noises">
          <Textarea value={engineNoises} onChange={setEngineNoises} placeholder="Describe any knocking, ticking, or unusual sounds, or leave blank if none…" rows={2} />
        </Question>

        <Question label="OBDII Codes" hint="List any fault codes found (comma-separated)">
          <Textarea value={obdiiCodes} onChange={setObdiiCodes} placeholder="e.g. P0420, P0300 — or leave blank if none" rows={2} />
        </Question>

        <Question label="Fluid Leaks" hint="List any leaks found and their severity">
          <Textarea value={fluidLeaks} onChange={setFluidLeaks} placeholder="e.g. Oil — minor, Coolant — none, or leave blank if none…" rows={2} />
        </Question>

        <Question label="Test Drive Notes" hint="Observations on suspension, transmission, brakes, and general feel">
          <Textarea value={driveNotes} onChange={setDriveNotes} placeholder="Describe your test drive observations…" rows={3} />
        </Question>
      </Card>

      {/* ── TIRES & WHEELS ── */}
      <Card accent="bg-rose-500">
        <SectionTitle>Tires &amp; Wheels</SectionTitle>
        <SectionSubtitle>Record tread depth and wheel condition.</SectionSubtitle>

        <Question label="Overall Tires & Wheels Rating" required>
          <RatingPicker value={tiresRating} onChange={setTiresRating} />
        </Question>

        <Question label="Tread Depth (mm)" hint="Measure each corner individually">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([['Front Left', treadFl, setTreadFl], ['Front Right', treadFr, setTreadFr], ['Rear Left', treadRl, setTreadRl], ['Rear Right', treadRr, setTreadRr]] as const).map(([label, val, set]) => (
              <div key={label}>
                <p className="text-xs text-[#78716c] mb-1.5 font-medium">{label}</p>
                <input
                  type="number"
                  step="0.1"
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder="mm"
                  className="w-full rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-4 py-3 text-sm text-[#1c1917] focus:outline-none focus:border-[#1d4ed8] focus:bg-white transition-colors"
                />
              </div>
            ))}
          </div>
        </Question>

        <Question label="Wheel / Rim Damage">
          <Textarea value={wheelDamage} onChange={setWheelDamage} placeholder="Describe any curb rash, bends, or damage, or leave blank if none…" rows={2} />
        </Question>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !vinResult}
        className="w-full rounded-xl bg-[#1d4ed8] py-4 text-base font-semibold text-white hover:bg-[#1e40af] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Submitting…' : 'Submit Inspection Report'}
      </button>

    </form>
  )
}
