'use client'

import { useState } from 'react'
import type { AiConditionData, ConditionRating } from '@/lib/types/condition'
import { ratingBg, ratingLabel } from '@/lib/types/condition'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ConditionReportProps {
  exterior:   AiConditionData['exterior']
  interior:   AiConditionData['interior']
  mechanical: AiConditionData['mechanical']
  tires:      AiConditionData['tires']
}

function RatingBadge({ rating }: { rating: ConditionRating }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${ratingBg(rating)}`}>
      {ratingLabel(rating)}
    </span>
  )
}

function Tag({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#e7e5e4] bg-[#fafaf9] px-2 py-0.5 text-xs text-[#57534e]">
      {text}
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-[#f5f5f4] last:border-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29e] mb-1">{label}</p>
      <div className="text-sm text-[#1c1917]">{value}</div>
    </div>
  )
}

function SectionCard({
  title,
  rating,
  ratingReason,
  children,
}: {
  title:        string
  rating:       ConditionRating
  ratingReason: string
  children:     React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white overflow-hidden">
      {/* Header — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#fafaf9] transition-colors"
      >
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-[#1c1917]">{title}</p>
          <RatingBadge rating={rating} />
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-[#a8a29e] shrink-0" />
          : <ChevronDown className="h-4 w-4 text-[#a8a29e] shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t border-[#f5f5f4] px-5 pb-5 pt-4">
          {/* Rating reason */}
          <p className="mb-4 text-xs italic leading-relaxed text-[#78716c]">{ratingReason}</p>
          {children}
        </div>
      )}
    </div>
  )
}

export function ConditionReport({ exterior, interior, mechanical, tires }: ConditionReportProps) {
  return (
    <div className="space-y-3">
      {/* ── Exterior ── */}
      <SectionCard title="Exterior" rating={exterior.rating} ratingReason={exterior.rating_reason}>
        {exterior.body_defects.length > 0 && (
          <DetailRow
            label="Body Defects"
            value={
              <div className="flex flex-wrap gap-1.5 mt-1">
                {exterior.body_defects.map((d, i) => <Tag key={i} text={d} />)}
              </div>
            }
          />
        )}
        {exterior.scratches_dings_dents && (
          <DetailRow label="Scratches / Dings / Dents" value={exterior.scratches_dings_dents} />
        )}
        {exterior.bumper_fender_damage && (
          <DetailRow label="Bumper / Fender Damage" value={exterior.bumper_fender_damage} />
        )}
        {exterior.paint_meter_readings.length > 0 && (
          <DetailRow
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
        {exterior.rust_areas.length > 0 && (
          <DetailRow
            label="Rust Areas"
            value={
              <div className="flex flex-wrap gap-1.5 mt-1">
                {exterior.rust_areas.map((a, i) => (
                  <span key={i} className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                    {a}
                  </span>
                ))}
              </div>
            }
          />
        )}
        {exterior.glass_damage.length > 0 && (
          <DetailRow
            label="Glass Damage"
            value={
              <div className="flex flex-wrap gap-1.5 mt-1">
                {exterior.glass_damage.map((d, i) => <Tag key={i} text={d} />)}
              </div>
            }
          />
        )}
        {exterior.glass_inspector_notes && (
          <DetailRow label="Glass Inspector Notes" value={exterior.glass_inspector_notes} />
        )}
      </SectionCard>

      {/* ── Interior ── */}
      <SectionCard title="Interior" rating={interior.rating} ratingReason={interior.rating_reason}>
        <DetailRow
          label="Seat Wear"
          value={
            interior.seat_wear_degraded
              ? `Degraded — ${interior.seat_wear_severity ?? 'unspecified severity'}`
              : 'No notable wear'
          }
        />
        <DetailRow
          label="Odor"
          value={
            interior.odor === 'none'
              ? 'No odor'
              : `${interior.odor.replace('_', '/')}${interior.odor_notes ? ` — ${interior.odor_notes}` : ''}`
          }
        />
        <DetailRow
          label="Climate Control / AC / Heating"
          value={
            <span className={interior.climate_control_working ? 'text-green-600' : 'text-red-500'}>
              {interior.climate_control_working ? 'Working' : 'Not working'}
            </span>
          }
        />
        {interior.missing_or_broken.length > 0 && (
          <DetailRow
            label="Missing or Non-Functional Items"
            value={
              <ul className="mt-1 space-y-0.5">
                {interior.missing_or_broken.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#a8a29e]" />
                    {item}
                  </li>
                ))}
              </ul>
            }
          />
        )}
        {interior.trim_damage_summary && (
          <DetailRow label="Interior Trim Summary" value={interior.trim_damage_summary} />
        )}
        {interior.cosmetic_defects && (
          <DetailRow label="Cosmetic Defects" value={interior.cosmetic_defects} />
        )}
      </SectionCard>

      {/* ── Mechanical ── */}
      <SectionCard title="Mechanical" rating={mechanical.rating} ratingReason={mechanical.rating_reason}>
        {mechanical.obdii_codes.length > 0 ? (
          <DetailRow
            label="OBDII Codes"
            value={
              <div className="mt-1 space-y-1">
                {mechanical.obdii_codes.map((c, i) => (
                  <div key={i} className="rounded-md border border-[#e7e5e4] bg-[#fafaf9] px-3 py-1.5 text-xs">
                    <span className="font-mono font-semibold text-red-600">{c.code}</span>
                    {' — '}{c.description}
                    <span className="ml-2 text-[#a8a29e]">({c.monitor_status})</span>
                  </div>
                ))}
              </div>
            }
          />
        ) : (
          <DetailRow label="OBDII Codes" value={<span className="text-green-600">No codes present</span>} />
        )}

        {mechanical.engine_noise_db != null && (
          <DetailRow label="Engine Noise" value={`${mechanical.engine_noise_db} dB`} />
        )}

        {mechanical.engine_abnormalities && (
          <DetailRow label="Engine Abnormalities" value={mechanical.engine_abnormalities} />
        )}

        {mechanical.fluid_leaks.length > 0 ? (
          <DetailRow
            label="Fluid Leaks"
            value={
              <ul className="mt-1 space-y-0.5">
                {mechanical.fluid_leaks.map((l, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                    <span className="capitalize">{l.fluid}</span>
                    <span className="text-[#a8a29e] text-xs">({l.severity})</span>
                  </li>
                ))}
              </ul>
            }
          />
        ) : (
          <DetailRow label="Fluid Leaks" value={<span className="text-green-600">None detected</span>} />
        )}

        {mechanical.drive_notes && (
          <DetailRow label="Drive Test Notes" value={mechanical.drive_notes} />
        )}
      </SectionCard>

      {/* ── Tires & Wheels ── */}
      <SectionCard title="Tires & Wheels" rating={tires.rating} ratingReason={tires.rating_reason}>
        <DetailRow
          label="Tread Depth (mm)"
          value={
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { pos: 'Front Left',  val: tires.tread_fl },
                { pos: 'Front Right', val: tires.tread_fr },
                { pos: 'Rear Left',   val: tires.tread_rl },
                { pos: 'Rear Right',  val: tires.tread_rr },
              ].map(({ pos, val }) => (
                <div key={pos} className="rounded-md border border-[#e7e5e4] bg-[#fafaf9] px-3 py-2">
                  <p className="text-[10px] text-[#a8a29e]">{pos}</p>
                  <p className="text-sm font-semibold">
                    {val != null ? (
                      <>
                        {val} mm
                        <span className="ml-1 text-xs font-normal text-[#a8a29e]">
                          {val >= 6 ? '(Good)' : val >= 4 ? '(Worn)' : '(Replace)'}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#a8a29e] font-normal">—</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          }
        />
        {tires.wheel_rim_damage && (
          <DetailRow label="Wheel / Rim Damage" value={tires.wheel_rim_damage} />
        )}
      </SectionCard>
    </div>
  )
}
