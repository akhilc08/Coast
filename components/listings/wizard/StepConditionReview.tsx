'use client'

import { useState } from 'react'
import { saveAiConditionAction } from '@/app/actions/listings'
import type { AiConditionData } from '@/lib/types/condition'
import { ratingBg, ratingLabel } from '@/lib/types/condition'

interface StepConditionReviewProps {
  listingId:     string
  data:          AiConditionData
  pdfStorageKey: string
  onSave:        () => void
}

function RatingBadge({ rating }: { rating: string }) {
  const cls = ratingBg(rating as never)
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {ratingLabel(rating as never)}
    </span>
  )
}

function SectionHeader({ title, rating }: { title: string; rating: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-[#1c1917]">{title}</h3>
      <RatingBadge rating={rating} />
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-[#f5f5f4] last:border-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e] mb-1">{label}</p>
      <div className="text-sm text-[#1c1917]">{value}</div>
    </div>
  )
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-[#a8a29e]">None noted</span>
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#a8a29e]" />
          {item}
        </li>
      ))}
    </ul>
  )
}

const sectionClass = 'rounded-xl border border-[#e7e5e4] bg-white p-6 mb-4'

export function StepConditionReview({ listingId, data, pdfStorageKey, onSave }: StepConditionReviewProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const { exterior, interior, mechanical, tires } = data

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    const result = await saveAiConditionAction(listingId, data, pdfStorageKey)
    if ('error' in result) {
      setError(result.error)
      setSaving(false)
      return
    }
    onSave()
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Condition Report Review</h2>
      <p className="mb-2 text-sm text-[#78716c]">Claude has analyzed the inspection report. Review the extracted data below.</p>
      <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
        <p className="text-xs font-semibold text-yellow-800">
          ⚠️ Once you confirm, this condition data is locked and cannot be changed.
        </p>
      </div>

      {/* ── Exterior ── */}
      <div className={sectionClass}>
        <SectionHeader title="Exterior" rating={exterior.rating} />
        <p className="mb-4 text-xs italic text-[#78716c]">{exterior.rating_reason}</p>

        <Field label="Body Defects" value={<TagList items={exterior.body_defects} />} />
        <Field label="Scratches, Dings & Dents" value={exterior.scratches_dings_dents || <span className="text-[#a8a29e]">None noted</span>} />
        <Field label="Bumper / Fender Damage" value={exterior.bumper_fender_damage || <span className="text-[#a8a29e]">None noted</span>} />

        {exterior.paint_meter_readings.length > 0 && (
          <Field
            label="Paint Meter Readings"
            value={
              <div className="flex flex-wrap gap-2 mt-1">
                {exterior.paint_meter_readings.map((r, i) => (
                  <span key={i} className="rounded-md border border-[#e7e5e4] bg-[#fafaf9] px-2 py-0.5 text-xs">
                    <span className="font-medium">{r.panel}</span>: {r.reading}
                  </span>
                ))}
              </div>
            }
          />
        )}

        <Field label="Rust Areas" value={<TagList items={exterior.rust_areas} />} />
        <Field label="Glass Damage" value={<TagList items={exterior.glass_damage} />} />
        {exterior.glass_inspector_notes && (
          <Field label="Glass Inspector Notes" value={exterior.glass_inspector_notes} />
        )}
      </div>

      {/* ── Interior ── */}
      <div className={sectionClass}>
        <SectionHeader title="Interior" rating={interior.rating} />
        <p className="mb-4 text-xs italic text-[#78716c]">{interior.rating_reason}</p>

        <Field
          label="Seat Wear"
          value={
            interior.seat_wear_degraded
              ? `Degraded — ${interior.seat_wear_severity ?? 'unknown severity'}`
              : 'No notable wear'
          }
        />

        <Field
          label="Odor"
          value={
            interior.odor === 'none'
              ? 'No odor'
              : `${interior.odor.replace('_', '/')}${interior.odor_notes ? ` — ${interior.odor_notes}` : ''}`
          }
        />

        <Field
          label="Climate Control / AC / Heating"
          value={
            <span className={interior.climate_control_working ? 'text-green-600' : 'text-red-500'}>
              {interior.climate_control_working ? 'Working' : 'Not working'}
            </span>
          }
        />

        <Field label="Missing or Non-Functional Items" value={<TagList items={interior.missing_or_broken} />} />
        <Field label="Interior Trim Summary" value={interior.trim_damage_summary || <span className="text-[#a8a29e]">None noted</span>} />
        <Field label="Cosmetic Defects" value={interior.cosmetic_defects || <span className="text-[#a8a29e]">None noted</span>} />
      </div>

      {/* ── Mechanical ── */}
      <div className={sectionClass}>
        <SectionHeader title="Mechanical" rating={mechanical.rating} />
        <p className="mb-4 text-xs italic text-[#78716c]">{mechanical.rating_reason}</p>

        {mechanical.obdii_codes.length > 0 ? (
          <Field
            label="OBDII Codes"
            value={
              <div className="space-y-1 mt-1">
                {mechanical.obdii_codes.map((c, i) => (
                  <div key={i} className="rounded-md border border-[#e7e5e4] bg-[#fafaf9] px-3 py-1.5 text-xs">
                    <span className="font-mono font-semibold">{c.code}</span>
                    {' — '}{c.description}
                    <span className="ml-2 text-[#a8a29e]">({c.monitor_status})</span>
                  </div>
                ))}
              </div>
            }
          />
        ) : (
          <Field label="OBDII Codes" value={<span className="text-[#a8a29e]">No codes present</span>} />
        )}

        {mechanical.engine_noise_db != null && (
          <Field label="Engine Noise" value={`${mechanical.engine_noise_db} dB`} />
        )}

        <Field label="Engine Abnormalities" value={mechanical.engine_abnormalities || <span className="text-[#a8a29e]">None noted</span>} />

        {mechanical.fluid_leaks.length > 0 ? (
          <Field
            label="Fluid Leaks"
            value={
              <ul className="space-y-0.5">
                {mechanical.fluid_leaks.map((l, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                    <span className="capitalize">{l.fluid}</span>
                    <span className="text-[#a8a29e]">({l.severity})</span>
                  </li>
                ))}
              </ul>
            }
          />
        ) : (
          <Field label="Fluid Leaks" value={<span className="text-[#a8a29e]">None detected</span>} />
        )}

        <Field label="Drive Test Notes" value={mechanical.drive_notes || <span className="text-[#a8a29e]">No notes</span>} />
      </div>

      {/* ── Tires & Wheels ── */}
      <div className={sectionClass}>
        <SectionHeader title="Tires & Wheels" rating={tires.rating} />
        <p className="mb-4 text-xs italic text-[#78716c]">{tires.rating_reason}</p>

        <Field
          label="Tread Depth (mm)"
          value={
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { pos: 'Front Left',  val: tires.tread_fl },
                { pos: 'Front Right', val: tires.tread_fr },
                { pos: 'Rear Left',   val: tires.tread_rl },
                { pos: 'Rear Right',  val: tires.tread_rr },
              ].map(({ pos, val }) => (
                <div key={pos} className="rounded-md border border-[#e7e5e4] bg-[#fafaf9] px-3 py-2">
                  <p className="text-[10px] text-[#a8a29e]">{pos}</p>
                  <p className="font-semibold">
                    {val != null ? `${val} mm` : <span className="text-[#a8a29e] font-normal">—</span>}
                  </p>
                </div>
              ))}
            </div>
          }
        />

        <Field label="Wheel / Rim Damage" value={tires.wheel_rim_damage || <span className="text-[#a8a29e]">None noted</span>} />
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={saving}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Confirm & Continue'}
      </button>
    </div>
  )
}
