import type { AiConditionData, ConditionRating } from '@/lib/types/condition'
import { ratingBg, ratingLabel } from '@/lib/types/condition'

interface ConditionReportProps {
  exterior?:   AiConditionData['exterior']   | null
  interior?:   AiConditionData['interior']   | null
  mechanical?: AiConditionData['mechanical'] | null
  tires?:      AiConditionData['tires']      | null
}

function RatingBadge({ rating }: { rating: ConditionRating }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ratingBg(rating)}`}>
      {ratingLabel(rating)}
    </span>
  )
}

function PendingBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-[#e7e5e4] bg-[#fafaf9] px-2.5 py-0.5 text-xs font-semibold text-[#a8a29e]">
      Pending
    </span>
  )
}

function SectionHeader({ title, rating }: { title: string; rating?: ConditionRating | null }) {
  const accent =
    rating === 'excellent' ? 'border-l-green-400' :
    rating === 'good'      ? 'border-l-blue-400'  :
    rating === 'average'   ? 'border-l-yellow-400':
    rating === 'bad'       ? 'border-l-red-400'   :
                             'border-l-[#e7e5e4]'

  return (
    <div className={`flex items-center justify-between border-l-4 pl-4 py-1 ${accent}`}>
      <h3 className="text-base font-bold text-[#1c1917]">{title}</h3>
      {rating ? <RatingBadge rating={rating} /> : <PendingBadge />}
    </div>
  )
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a8a29e]">
      {children}
    </p>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 border-b border-[#f5f5f4] py-3 last:border-0 last:pb-0">
      <span className="text-xs font-medium text-[#78716c] leading-relaxed pt-0.5">{label}</span>
      <div className="text-sm text-[#1c1917]">{children}</div>
    </div>
  )
}

function DamagePill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[#e7e5e4] bg-[#fafaf9] px-2 py-0.5 text-xs text-[#57534e]">
      {text}
    </span>
  )
}

function StatusBadge({ ok, yes, no }: { ok: boolean; yes?: string; no?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${ok ? 'text-green-600' : 'text-red-500'}`}>
      <span>{ok ? '✓' : '✗'}</span>
      {ok ? (yes ?? 'Yes') : (no ?? 'No')}
    </span>
  )
}

function Dash() {
  return <span className="text-sm text-[#a8a29e]">—</span>
}

function NoneNoted() {
  return <span className="text-sm text-[#a8a29e]">None noted</span>
}

export function ConditionReport({ exterior, interior, mechanical, tires }: ConditionReportProps) {
  return (
    <div className="space-y-8">

      {/* ── EXTERIOR ─────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Exterior" rating={exterior?.rating} />
        {exterior?.rating_reason && (
          <p className="mt-3 mb-5 text-xs italic leading-relaxed text-[#78716c]">{exterior.rating_reason}</p>
        )}

        <div className={`rounded-xl border border-[#e7e5e4] overflow-hidden ${!exterior ? 'mt-4' : 'mt-3'}`}>
          <div className="px-5 py-4">
            <SubLabel>Surface / Body Damage</SubLabel>
            <Row label="Body Defects">
              {exterior
                ? exterior.body_defects.length > 0
                  ? <div className="flex flex-wrap gap-1.5">{exterior.body_defects.map((d, i) => <DamagePill key={i} text={d} />)}</div>
                  : <NoneNoted />
                : <Dash />
              }
            </Row>
          </div>

          <div className="border-t border-[#e7e5e4] bg-[#fafaf9] px-5 py-3">
            <SubLabel>Paint Condition</SubLabel>
          </div>
          <div className="px-5 py-4">
            <Row label="Paint Meter Readings">
              {exterior
                ? exterior.paint_meter_readings.length > 0
                  ? (
                    <div className="flex flex-wrap gap-2">
                      {exterior.paint_meter_readings.map((r, i) => (
                        <span key={i} className="rounded border border-[#e7e5e4] bg-[#fafaf9] px-2.5 py-1 text-xs">
                          <span className="font-semibold text-[#1c1917]">{r.panel}</span>
                          <span className="mx-1 text-[#a8a29e]">·</span>
                          {r.reading}
                        </span>
                      ))}
                    </div>
                  )
                  : <NoneNoted />
                : <Dash />
              }
            </Row>
          </div>

          <div className="border-t border-[#e7e5e4] bg-[#fafaf9] px-5 py-3">
            <SubLabel>Rust</SubLabel>
          </div>
          <div className="px-5 py-4">
            <Row label="Rust Areas">
              {exterior
                ? exterior.rust_areas.length > 0
                  ? (
                    <div className="flex flex-wrap gap-1.5">
                      {exterior.rust_areas.map((a, i) => (
                        <span key={i} className="inline-flex items-center rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                          {a}
                        </span>
                      ))}
                    </div>
                  )
                  : <NoneNoted />
                : <Dash />
              }
            </Row>
          </div>

          <div className="border-t border-[#e7e5e4] bg-[#fafaf9] px-5 py-3">
            <SubLabel>Glass</SubLabel>
          </div>
          <div className="px-5 py-4">
            <Row label="Glass Damage">
              {exterior
                ? exterior.glass_damage.length > 0
                  ? <div className="flex flex-wrap gap-1.5">{exterior.glass_damage.map((d, i) => <DamagePill key={i} text={d} />)}</div>
                  : <NoneNoted />
                : <Dash />
              }
            </Row>
            <Row label="Inspector Notes">
              {exterior ? (exterior.glass_inspector_notes || <NoneNoted />) : <Dash />}
            </Row>
          </div>
        </div>
      </div>

      {/* ── INTERIOR ─────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Interior" rating={interior?.rating} />
        {interior?.rating_reason && (
          <p className="mt-3 mb-5 text-xs italic leading-relaxed text-[#78716c]">{interior.rating_reason}</p>
        )}

        <div className={`rounded-xl border border-[#e7e5e4] overflow-hidden ${!interior ? 'mt-4' : 'mt-3'}`}>
          <div className="px-5 py-4">
            <SubLabel>Seat Wear</SubLabel>
            <Row label="Condition">
              {interior
                ? interior.seat_wear_degraded
                  ? (
                    <span className="text-sm">
                      <span className="font-medium text-red-500">Degraded</span>
                      {interior.seat_wear_severity && (
                        <span className="ml-2 text-[#78716c] capitalize">— {interior.seat_wear_severity}</span>
                      )}
                    </span>
                  )
                  : <StatusBadge ok yes="No notable wear" />
                : <Dash />
              }
            </Row>
          </div>

          <div className="border-t border-[#e7e5e4] bg-[#fafaf9] px-5 py-3">
            <SubLabel>Odor</SubLabel>
          </div>
          <div className="px-5 py-4">
            <Row label="Odor Detected">
              {interior
                ? interior.odor === 'none'
                  ? <StatusBadge ok yes="No odor" />
                  : (
                    <span className="text-sm">
                      <span className="font-medium capitalize text-[#1c1917]">
                        {interior.odor === 'mold_mildew' ? 'Mold / Mildew' : interior.odor.charAt(0).toUpperCase() + interior.odor.slice(1)}
                      </span>
                      {interior.odor_notes && <span className="ml-2 text-[#78716c]">— {interior.odor_notes}</span>}
                    </span>
                  )
                : <Dash />
              }
            </Row>
          </div>

          <div className="border-t border-[#e7e5e4] bg-[#fafaf9] px-5 py-3">
            <SubLabel>Controls</SubLabel>
          </div>
          <div className="px-5 py-4">
            <Row label="Climate Control / AC / Heat">
              {interior
                ? <StatusBadge ok={interior.climate_control_working} yes="Working" no="Not working" />
                : <Dash />
              }
            </Row>
            <Row label="Missing or Non-Functional">
              {interior
                ? interior.missing_or_broken.length > 0
                  ? (
                    <ul className="space-y-1">
                      {interior.missing_or_broken.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )
                  : <StatusBadge ok yes="All items functional" />
                : <Dash />
              }
            </Row>
          </div>

          <div className="border-t border-[#e7e5e4] bg-[#fafaf9] px-5 py-3">
            <SubLabel>Interior Trim &amp; Cosmetics</SubLabel>
          </div>
          <div className="px-5 py-4">
            <Row label="Trim Damage Summary">
              {interior ? (interior.trim_damage_summary || <NoneNoted />) : <Dash />}
            </Row>
            <Row label="Cosmetic Defects">
              {interior ? (interior.cosmetic_defects || <NoneNoted />) : <Dash />}
            </Row>
          </div>
        </div>
      </div>

      {/* ── MECHANICAL ───────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Mechanical" rating={mechanical?.rating} />
        {mechanical?.rating_reason && (
          <p className="mt-3 mb-5 text-xs italic leading-relaxed text-[#78716c]">{mechanical.rating_reason}</p>
        )}

        <div className={`rounded-xl border border-[#e7e5e4] overflow-hidden ${!mechanical ? 'mt-4' : 'mt-3'}`}>
          <div className="px-5 py-4">
            <SubLabel>Engine</SubLabel>
            <Row label="OBDII Codes">
              {mechanical
                ? mechanical.obdii_codes.length > 0
                  ? (
                    <div className="space-y-1.5">
                      {mechanical.obdii_codes.map((c, i) => (
                        <div key={i} className="rounded border border-[#e7e5e4] bg-[#fafaf9] px-3 py-2 text-xs">
                          <span className="font-mono font-bold text-red-600">{c.code}</span>
                          <span className="mx-2 text-[#a8a29e]">·</span>
                          <span>{c.description}</span>
                          <span className="ml-2 rounded bg-[#e7e5e4] px-1.5 py-0.5 text-[10px] text-[#78716c] capitalize">
                            {c.monitor_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                  : <StatusBadge ok yes="No codes present" />
                : <Dash />
              }
            </Row>
            <Row label="Engine Noise">
              {mechanical
                ? mechanical.engine_noise_db != null ? `${mechanical.engine_noise_db} dB` : <NoneNoted />
                : <Dash />
              }
            </Row>
            <Row label="Other Abnormalities">
              {mechanical ? (mechanical.engine_abnormalities || <NoneNoted />) : <Dash />}
            </Row>
          </div>

          <div className="border-t border-[#e7e5e4] bg-[#fafaf9] px-5 py-3">
            <SubLabel>Fluid Leaks &amp; Contamination</SubLabel>
          </div>
          <div className="px-5 py-4">
            <Row label="Leaks Detected">
              {mechanical
                ? mechanical.fluid_leaks.length > 0
                  ? (
                    <ul className="space-y-1">
                      {mechanical.fluid_leaks.map((l, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                          <span className="capitalize font-medium">{l.fluid}</span>
                          <span className="text-xs text-[#78716c] capitalize">({l.severity})</span>
                        </li>
                      ))}
                    </ul>
                  )
                  : <StatusBadge ok yes="None detected" />
                : <Dash />
              }
            </Row>
          </div>

          <div className="border-t border-[#e7e5e4] bg-[#fafaf9] px-5 py-3">
            <SubLabel>Test Drive</SubLabel>
          </div>
          <div className="px-5 py-4">
            <Row label="Drive Notes">
              {mechanical ? (mechanical.drive_notes || <NoneNoted />) : <Dash />}
            </Row>
          </div>
        </div>
      </div>

      {/* ── TIRES & WHEELS ───────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Tires &amp; Wheels" rating={tires?.rating} />
        {tires?.rating_reason && (
          <p className="mt-3 mb-5 text-xs italic leading-relaxed text-[#78716c]">{tires.rating_reason}</p>
        )}

        <div className={`rounded-xl border border-[#e7e5e4] overflow-hidden ${!tires ? 'mt-4' : 'mt-3'}`}>
          <div className="px-5 py-4">
            <SubLabel>Tread Depth</SubLabel>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { pos: 'Front Left',  val: tires?.tread_fl },
                { pos: 'Front Right', val: tires?.tread_fr },
                { pos: 'Rear Left',   val: tires?.tread_rl },
                { pos: 'Rear Right',  val: tires?.tread_rr },
              ].map(({ pos, val }) => (
                <div key={pos} className="rounded-lg border border-[#e7e5e4] bg-[#fafaf9] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a8a29e] mb-1">{pos}</p>
                  {val != null
                    ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold text-[#1c1917]">{val}</span>
                        <span className="text-xs text-[#78716c]">mm</span>
                        <span className={`text-xs font-medium ml-auto ${val >= 6 ? 'text-green-600' : val >= 4 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {val >= 6 ? 'Good' : val >= 4 ? 'Worn' : 'Replace'}
                        </span>
                      </div>
                    )
                    : <span className="text-sm text-[#a8a29e]">—</span>
                  }
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#e7e5e4] bg-[#fafaf9] px-5 py-3">
            <SubLabel>Wheels &amp; Rims</SubLabel>
          </div>
          <div className="px-5 py-4">
            <Row label="Wheel / Rim Damage">
              {tires ? (tires.wheel_rim_damage || <NoneNoted />) : <Dash />}
            </Row>
          </div>
        </div>
      </div>

    </div>
  )
}
