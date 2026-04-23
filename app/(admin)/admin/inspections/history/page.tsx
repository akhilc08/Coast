import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { ratingBg, ratingLabel } from '@/lib/types/condition'
import type { ConditionRating } from '@/lib/types/condition'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function GradeBadge({ grade }: { grade: string | null }) {
  const styles: Record<string, string> = {
    excellent: 'border-green-200 bg-green-50 text-green-700',
    good:      'border-blue-200 bg-blue-50 text-blue-700',
    fair:      'border-yellow-200 bg-yellow-50 text-yellow-700',
    poor:      'border-red-200 bg-red-50 text-red-600',
  }
  if (!grade) return <span className="text-xs text-[#a8a29e]">—</span>
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${styles[grade] ?? 'border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]'}`}>
      {grade}
    </span>
  )
}

function RatingPill({ rating }: { rating: ConditionRating | null | undefined }) {
  if (!rating) return <span className="text-xs text-[#a8a29e]">—</span>
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ratingBg(rating)}`}>
      {ratingLabel(rating)}
    </span>
  )
}

interface InspectionRow {
  id: string
  inspection_date: string | null
  inspector_name: string | null
  mileage_at_inspection: number | null
  overall_grade: string | null
  created_at: string
  exterior:   { rating: ConditionRating } | null
  interior:   { rating: ConditionRating } | null
  mechanical: { rating: ConditionRating } | null
  tires:      { rating: ConditionRating } | null
  listings: { id: string; year: number; make: string; model: string; vin: string } | null
}

export default async function InspectionHistoryPage() {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('inspections')
    .select(`
      id, inspection_date, inspector_name, mileage_at_inspection, overall_grade, created_at,
      exterior, interior, mechanical, tires,
      listings(id, year, make, model, vin)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch inspections: ${error.message}`)

  const rows = (data ?? []) as unknown as InspectionRow[]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/inspections" className="text-sm text-[#78716c] hover:text-[#1c1917]">
            &larr; Inspections
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#1c1917]">Inspection History</h1>
          <p className="mt-1 text-sm text-[#78716c]">{rows.length} report{rows.length !== 1 ? 's' : ''} on record</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e7e5e4] bg-white">
        {rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[#a8a29e]">No inspection reports submitted yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e7e5e4] bg-[#faf9f6] text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Vehicle</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">VIN</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Inspector</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Inspected</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Grade</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Exterior</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Interior</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Mechanical</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Tires</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e5e4] text-sm">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#faf9f6] transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/inspections/history/${row.id}`}
                      className="font-medium text-[#1c1917] hover:underline"
                    >
                      {row.listings ? `${row.listings.year} ${row.listings.make} ${row.listings.model}` : '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#78716c]">{row.listings?.vin ?? '—'}</td>
                  <td className="px-4 py-3 text-[#78716c]">{row.inspector_name ?? '—'}</td>
                  <td className="px-4 py-3 text-[#78716c]">{formatDate(row.inspection_date)}</td>
                  <td className="px-4 py-3"><GradeBadge grade={row.overall_grade} /></td>
                  <td className="px-4 py-3"><RatingPill rating={row.exterior?.rating} /></td>
                  <td className="px-4 py-3"><RatingPill rating={row.interior?.rating} /></td>
                  <td className="px-4 py-3"><RatingPill rating={row.mechanical?.rating} /></td>
                  <td className="px-4 py-3"><RatingPill rating={row.tires?.rating} /></td>
                  <td className="px-4 py-3 text-[#78716c]">{formatDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
