import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ratingBg, ratingLabel } from '@/lib/types/condition'
import type { AiConditionData, ConditionRating } from '@/lib/types/condition'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatMileage(n: number | null): string {
  if (!n) return '—'
  return n.toLocaleString('en-US') + ' mi'
}

function RatingBadge({ rating }: { rating: ConditionRating }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ratingBg(rating)}`}>
      {ratingLabel(rating)}
    </span>
  )
}

function Section({ title, rating, children }: { title: string; rating: ConditionRating; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[#1c1917]">{title}</h3>
        <RatingBadge rating={rating} />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-[#f5f5f4] pb-3 last:border-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e] mb-1">{label}</p>
      <div className="text-sm text-[#1c1917]">{value}</div>
    </div>
  )
}

function TagList({ items }: { items: string[] }) {
  if (!items?.length) return <span className="text-[#a8a29e]">None noted</span>
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

export default async function InspectionHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('inspections')
    .select(`
      id, inspection_date, inspector_name, mileage_at_inspection, overall_grade, created_at,
      exterior, interior, mechanical, tires,
      listings(id, year, make, model, vin)
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const row = data as unknown as {
    id: string
    inspection_date: string | null
    inspector_name: string | null
    mileage_at_inspection: number | null
    overall_grade: string | null
    created_at: string
    exterior:   AiConditionData['exterior'] | null
    interior:   AiConditionData['interior'] | null
    mechanical: AiConditionData['mechanical'] | null
    tires:      AiConditionData['tires'] | null
    listings: { id: string; year: number; make: string; model: string; vin: string } | null
  }

  const ext  = row.exterior
  const int_ = row.interior
  const mech = row.mechanical
  const tires = row.tires

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/inspections/history" className="text-sm text-[#78716c] hover:text-[#1c1917]">
          &larr; Inspection History
        </Link>
        {row.listings && (
          <Link href={`/admin/inspections/${row.listings.id}`} className="text-sm text-[#78716c] hover:text-[#1c1917]">
            View listing &rarr;
          </Link>
        )}
      </div>

      <h1 className="text-2xl font-bold text-[#1c1917]">
        {row.listings ? `${row.listings.year} ${row.listings.make} ${row.listings.model}` : 'Inspection Report'}
      </h1>
      {row.listings && (
        <p className="mt-1 font-mono text-sm text-[#78716c]">{row.listings.vin}</p>
      )}

      {/* Summary card */}
      <div className="mt-6 rounded-xl border border-[#e7e5e4] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e] mb-3">Report Summary</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Inspection Date', formatDate(row.inspection_date)],
            ['Inspector',       row.inspector_name ?? '—'],
            ['Mileage',         formatMileage(row.mileage_at_inspection)],
            ['Submitted',       formatDate(row.created_at)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e] mb-1">{label}</p>
              <p className="text-sm text-[#1c1917]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {ext && (
          <Section title="Exterior" rating={ext.rating}>
            <Field label="Body Defects" value={<TagList items={ext.body_defects} />} />
            <Field label="Glass Damage" value={<TagList items={ext.glass_damage} />} />
            {ext.paint_meter_readings?.length > 0 && (
              <Field label="Paint Meter Readings" value={
                <ul className="space-y-0.5">
                  {ext.paint_meter_readings.map((r, i) => (
                    <li key={i} className="text-sm">{r.panel}: {r.reading}</li>
                  ))}
                </ul>
              } />
            )}
            {ext.rating_reason && <Field label="Notes" value={ext.rating_reason} />}
          </Section>
        )}

        {int_ && (
          <Section title="Interior" rating={int_.rating}>
            <Field label="Seat Wear" value={int_.seat_wear_degraded ? `Degraded — ${int_.seat_wear_severity ?? 'unknown severity'}` : 'No notable wear'} />
            <Field label="Odor" value={int_.odor === 'none' ? 'None' : int_.odor?.replace('_', '/') ?? '—'} />
            <Field label="Climate Control" value={int_.climate_control_working ? 'Working' : 'Not working'} />
            {int_.trim_damage_summary && <Field label="Interior Damage" value={int_.trim_damage_summary} />}
            {int_.missing_or_broken?.length > 0 && <Field label="Missing / Broken" value={<TagList items={int_.missing_or_broken} />} />}
            {int_.rating_reason && <Field label="Notes" value={int_.rating_reason} />}
          </Section>
        )}

        {mech && (
          <Section title="Mechanical" rating={mech.rating}>
            {mech.engine_abnormalities && <Field label="Engine Abnormalities" value={mech.engine_abnormalities} />}
            {mech.obdii_codes?.length > 0 && (
              <Field label="OBDII Codes" value={
                <ul className="space-y-0.5">
                  {mech.obdii_codes.map((c, i) => (
                    <li key={i} className="text-sm font-mono">{c.code}{c.description ? ` — ${c.description}` : ''}</li>
                  ))}
                </ul>
              } />
            )}
            {mech.fluid_leaks?.length > 0 && (
              <Field label="Fluid Leaks" value={
                <TagList items={mech.fluid_leaks.map(l => `${l.fluid} — ${l.severity}`)} />
              } />
            )}
            {mech.drive_notes && <Field label="Test Drive Notes" value={mech.drive_notes} />}
            {mech.rating_reason && <Field label="Notes" value={mech.rating_reason} />}
          </Section>
        )}

        {tires && (
          <Section title="Tires & Wheels" rating={tires.rating}>
            <Field label="Tread Depth" value={
              <div className="grid grid-cols-4 gap-2 mt-1">
                {([['FL', tires.tread_fl], ['FR', tires.tread_fr], ['RL', tires.tread_rl], ['RR', tires.tread_rr]] as [string, number | null][]).map(([pos, val]) => (
                  <div key={pos} className="rounded-lg border border-[#e7e5e4] p-2 text-center">
                    <p className="text-[10px] text-[#a8a29e]">{pos}</p>
                    <p className="text-sm font-medium text-[#1c1917]">{val != null ? `${val} mm` : '—'}</p>
                  </div>
                ))}
              </div>
            } />
            {tires.wheel_rim_damage && <Field label="Wheel / Rim Damage" value={tires.wheel_rim_damage} />}
            {tires.rating_reason && <Field label="Notes" value={tires.rating_reason} />}
          </Section>
        )}
      </div>
    </div>
  )
}
