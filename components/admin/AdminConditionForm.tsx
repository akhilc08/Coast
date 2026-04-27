'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminSaveAiConditionAction } from '@/app/actions/admin'
import type { AiConditionData, ConditionRating, AiExteriorCondition, AiInteriorCondition, AiMechanicalCondition, AiTiresCondition } from '@/lib/types/condition'

interface AdminConditionFormProps {
  listingId: string
  initial?: AiConditionData | null
}

const RATINGS: ConditionRating[] = ['excellent', 'good', 'average', 'bad']

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-widest text-[#a8a29e] border-b border-[#e7e5e4] pb-2 mb-3">{children}</h3>
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e] mb-1">{children}</p>
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-blue-500" />
  )
}

function TextArea({ value, onChange, placeholder, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
  )
}

function RatingSelect({ value, onChange }: { value: ConditionRating; onChange: (v: ConditionRating) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as ConditionRating)}
      className="w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-blue-500">
      {RATINGS.map(r => <option key={r} value={r}>{r === 'average' ? 'Fair' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
    </select>
  )
}

function StringList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <TextInput value={item} onChange={v => { const n = [...items]; n[i] = v; onChange(n) }} placeholder={placeholder} />
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-[#a8a29e] hover:text-red-500 text-lg px-1">×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="text-xs text-blue-600 hover:text-blue-500">+ Add</button>
    </div>
  )
}

function Col2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function defaultExterior(): AiExteriorCondition {
  return { rating: 'good', rating_reason: '', body_defects: [], scratches_dings_dents: '', bumper_fender_damage: '', paint_meter_readings: [], rust_areas: [], glass_damage: [], glass_inspector_notes: '' }
}
function defaultInterior(): AiInteriorCondition {
  return { rating: 'good', rating_reason: '', seat_wear_degraded: false, seat_wear_severity: null, odor: 'none', odor_notes: '', climate_control_working: true, missing_or_broken: [], trim_damage_summary: '', cosmetic_defects: '' }
}
function defaultMechanical(): AiMechanicalCondition {
  return { rating: 'good', rating_reason: '', obdii_codes: [], engine_noise_db: null, engine_abnormalities: '', fluid_leaks: [], drive_notes: '' }
}
function defaultTires(): AiTiresCondition {
  return { rating: 'good', rating_reason: '', tread_fl: null, tread_fr: null, tread_rl: null, tread_rr: null, wheel_rim_damage: '' }
}

export function AdminConditionForm({ listingId, initial }: AdminConditionFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [ext, setExt] = useState<AiExteriorCondition>(initial?.exterior ?? defaultExterior())
  const [int_, setInt] = useState<AiInteriorCondition>(initial?.interior ?? defaultInterior())
  const [mech, setMech] = useState<AiMechanicalCondition>(initial?.mechanical ?? defaultMechanical())
  const [tires, setTires] = useState<AiTiresCondition>(initial?.tires ?? defaultTires())

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    const result = await adminSaveAiConditionAction(listingId, { exterior: ext, interior: int_, mechanical: mech, tires }, '')
    if ('error' in result) { setError(result.error); setSaving(false); return }
    setSaved(true); setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">

      {/* ── EXTERIOR ── */}
      <div>
        <SectionTitle>Exterior</SectionTitle>
        <Col2>
          <Field label="Rating">
            <RatingSelect value={ext.rating} onChange={v => setExt(p => ({ ...p, rating: v }))} />
          </Field>
          <Field label="Rating Reason">
            <TextArea value={ext.rating_reason} onChange={v => setExt(p => ({ ...p, rating_reason: v }))} placeholder="Explain the rating…" />
          </Field>
          <Field label="Body Defects">
            <StringList items={ext.body_defects} onChange={v => setExt(p => ({ ...p, body_defects: v }))} placeholder="e.g. Dent on quarter panel" />
          </Field>
          <Field label="Scratches, Dings & Dents">
            <TextArea value={ext.scratches_dings_dents} onChange={v => setExt(p => ({ ...p, scratches_dings_dents: v }))} placeholder="Describe…" />
          </Field>
          <Field label="Rust Areas">
            <StringList items={ext.rust_areas} onChange={v => setExt(p => ({ ...p, rust_areas: v }))} placeholder="e.g. Rear wheel arch" />
          </Field>
          <Field label="Glass Damage">
            <StringList items={ext.glass_damage} onChange={v => setExt(p => ({ ...p, glass_damage: v }))} placeholder="e.g. Chip in windshield" />
          </Field>
          <Field label="Paint Meter Readings" full>
            <div className="space-y-1.5">
              {ext.paint_meter_readings.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <TextInput value={r.panel} onChange={v => setExt(p => { const a = [...p.paint_meter_readings]; a[i] = { ...a[i], panel: v }; return { ...p, paint_meter_readings: a } })} placeholder="Panel (e.g. Hood)" />
                  <TextInput value={r.reading} onChange={v => setExt(p => { const a = [...p.paint_meter_readings]; a[i] = { ...a[i], reading: v }; return { ...p, paint_meter_readings: a } })} placeholder="Reading (e.g. 120 µm)" />
                  <button type="button" onClick={() => setExt(p => ({ ...p, paint_meter_readings: p.paint_meter_readings.filter((_, idx) => idx !== i) }))} className="text-[#a8a29e] hover:text-red-500 text-lg px-1">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setExt(p => ({ ...p, paint_meter_readings: [...p.paint_meter_readings, { panel: '', reading: '' }] }))} className="text-xs text-blue-600 hover:text-blue-500">+ Add reading</button>
            </div>
          </Field>
        </Col2>
      </div>

      {/* ── INTERIOR ── */}
      <div>
        <SectionTitle>Interior</SectionTitle>
        <Col2>
          <Field label="Rating">
            <RatingSelect value={int_.rating} onChange={v => setInt(p => ({ ...p, rating: v }))} />
          </Field>
          <Field label="Rating Reason">
            <TextArea value={int_.rating_reason} onChange={v => setInt(p => ({ ...p, rating_reason: v }))} placeholder="Explain the rating…" />
          </Field>

          <Field label="Seat Wear">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={int_.seat_wear_degraded} onChange={e => setInt(p => ({ ...p, seat_wear_degraded: e.target.checked, seat_wear_severity: e.target.checked ? p.seat_wear_severity : null }))} className="h-4 w-4 rounded border-[#e7e5e4]" />
              <span className="text-sm text-[#1c1917]">Degraded</span>
            </label>
            {int_.seat_wear_degraded && (
              <select value={int_.seat_wear_severity ?? ''} onChange={e => setInt(p => ({ ...p, seat_wear_severity: e.target.value as 'minor' | 'moderate' | 'severe' }))}
                className="w-full rounded-lg border border-[#e7e5e4] px-3 py-2 text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Severity…</option>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            )}
          </Field>

          <Field label="Odor">
            <div className="flex flex-col gap-1.5">
              {(['none', 'smoke', 'mold_mildew', 'burnt', 'other'] as const).map(o => (
                <label key={o} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="odor" checked={int_.odor === o} onChange={() => setInt(p => ({ ...p, odor: o }))} className="h-3.5 w-3.5" />
                  <span className="text-sm text-[#1c1917]">{o === 'mold_mildew' ? 'Mold/Mildew' : o === 'none' ? 'No Odor' : o.charAt(0).toUpperCase() + o.slice(1)}</span>
                </label>
              ))}
              {int_.odor !== 'none' && (
                <TextInput value={int_.odor_notes} onChange={v => setInt(p => ({ ...p, odor_notes: v }))} placeholder="Odor notes…" />
              )}
            </div>
          </Field>

          <Field label="Climate Control / AC / Heat">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={int_.climate_control_working} onChange={e => setInt(p => ({ ...p, climate_control_working: e.target.checked }))} className="h-4 w-4 rounded border-[#e7e5e4]" />
              <span className="text-sm text-[#1c1917]">Working</span>
            </label>
          </Field>

          <Field label="Missing or Non-Functional">
            <StringList items={int_.missing_or_broken} onChange={v => setInt(p => ({ ...p, missing_or_broken: v }))} placeholder="e.g. Window switch broken" />
          </Field>
          <Field label="Trim Damage Summary">
            <TextArea value={int_.trim_damage_summary} onChange={v => setInt(p => ({ ...p, trim_damage_summary: v }))} placeholder="Interior trim integrity…" />
          </Field>
          <Field label="Cosmetic Defects">
            <TextArea value={int_.cosmetic_defects} onChange={v => setInt(p => ({ ...p, cosmetic_defects: v }))} placeholder="Scratches, dents inside cabin…" />
          </Field>
        </Col2>
      </div>

      {/* ── MECHANICAL ── */}
      <div>
        <SectionTitle>Mechanical</SectionTitle>
        <Col2>
          <Field label="Rating">
            <RatingSelect value={mech.rating} onChange={v => setMech(p => ({ ...p, rating: v }))} />
          </Field>
          <Field label="Rating Reason">
            <TextArea value={mech.rating_reason} onChange={v => setMech(p => ({ ...p, rating_reason: v }))} placeholder="Explain the rating…" />
          </Field>

          <Field label="Engine Noise (dB)">
            <input type="number" value={mech.engine_noise_db ?? ''} onChange={e => setMech(p => ({ ...p, engine_noise_db: e.target.value ? Number(e.target.value) : null }))} placeholder="e.g. 72"
              className="w-full rounded-lg border border-[#e7e5e4] px-3 py-2 text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </Field>
          <Field label="Engine Abnormalities">
            <TextArea value={mech.engine_abnormalities} onChange={v => setMech(p => ({ ...p, engine_abnormalities: v }))} placeholder="Any abnormalities observed…" />
          </Field>

          <Field label="OBDII Codes" full>
            <div className="space-y-1.5">
              {mech.obdii_codes.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <TextInput value={c.code} onChange={v => setMech(p => { const a = [...p.obdii_codes]; a[i] = { ...a[i], code: v }; return { ...p, obdii_codes: a } })} placeholder="Code (e.g. P0420)" />
                  <TextInput value={c.description} onChange={v => setMech(p => { const a = [...p.obdii_codes]; a[i] = { ...a[i], description: v }; return { ...p, obdii_codes: a } })} placeholder="Description" />
                  <select value={c.monitor_status} onChange={e => setMech(p => { const a = [...p.obdii_codes]; a[i] = { ...a[i], monitor_status: e.target.value }; return { ...p, obdii_codes: a } })}
                    className="rounded-lg border border-[#e7e5e4] px-2 py-2 text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="complete">Complete</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="not run">Not Run</option>
                  </select>
                  <button type="button" onClick={() => setMech(p => ({ ...p, obdii_codes: p.obdii_codes.filter((_, idx) => idx !== i) }))} className="text-[#a8a29e] hover:text-red-500 text-lg px-1">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setMech(p => ({ ...p, obdii_codes: [...p.obdii_codes, { code: '', description: '', monitor_status: 'complete' }] }))} className="text-xs text-blue-600 hover:text-blue-500">+ Add code</button>
            </div>
          </Field>

          <Field label="Fluid Leaks" full>
            <div className="space-y-1.5">
              {mech.fluid_leaks.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <TextInput value={l.fluid} onChange={v => setMech(p => { const a = [...p.fluid_leaks]; a[i] = { ...a[i], fluid: v }; return { ...p, fluid_leaks: a } })} placeholder="Fluid type (e.g. Oil)" />
                  <select value={l.severity} onChange={e => setMech(p => { const a = [...p.fluid_leaks]; a[i] = { ...a[i], severity: e.target.value as 'minor' | 'moderate' | 'severe' }; return { ...p, fluid_leaks: a } })}
                    className="rounded-lg border border-[#e7e5e4] px-3 py-2 text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  <button type="button" onClick={() => setMech(p => ({ ...p, fluid_leaks: p.fluid_leaks.filter((_, idx) => idx !== i) }))} className="text-[#a8a29e] hover:text-red-500 text-lg px-1">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setMech(p => ({ ...p, fluid_leaks: [...p.fluid_leaks, { fluid: '', severity: 'minor' }] }))} className="text-xs text-blue-600 hover:text-blue-500">+ Add leak</button>
            </div>
          </Field>

          <Field label="Test Drive Notes" full>
            <TextArea value={mech.drive_notes} onChange={v => setMech(p => ({ ...p, drive_notes: v }))} placeholder="Suspension, transmission, brakes…" rows={2} />
          </Field>
        </Col2>
      </div>

      {/* ── TIRES & WHEELS ── */}
      <div>
        <SectionTitle>Tires &amp; Wheels</SectionTitle>
        <Col2>
          <Field label="Rating">
            <RatingSelect value={tires.rating} onChange={v => setTires(p => ({ ...p, rating: v }))} />
          </Field>
          <Field label="Rating Reason">
            <TextArea value={tires.rating_reason} onChange={v => setTires(p => ({ ...p, rating_reason: v }))} placeholder="Explain the rating…" />
          </Field>

          <Field label="Tread Depth (mm)" full>
            <div className="grid grid-cols-4 gap-2">
              {([['Front Left', 'tread_fl'], ['Front Right', 'tread_fr'], ['Rear Left', 'tread_rl'], ['Rear Right', 'tread_rr']] as const).map(([lbl, key]) => (
                <div key={key}>
                  <p className="text-[10px] text-[#a8a29e] mb-1">{lbl}</p>
                  <input type="number" step="0.1" value={tires[key] ?? ''} onChange={e => setTires(p => ({ ...p, [key]: e.target.value ? Number(e.target.value) : null }))} placeholder="mm"
                    className="w-full rounded-lg border border-[#e7e5e4] px-3 py-2 text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          </Field>

          <Field label="Wheel / Rim Damage" full>
            <TextArea value={tires.wheel_rim_damage} onChange={v => setTires(p => ({ ...p, wheel_rim_damage: v }))} placeholder="Describe any damage to wheels or rims…" rows={2} />
          </Field>
        </Col2>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {saved && <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Condition data saved and locked.</p>}
      <button type="button" onClick={handleSave} disabled={saving}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Condition Report'}
      </button>
    </div>
  )
}
