import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { ratingBg, ratingLabel } from '@/lib/types/condition'
import type { ConditionRating } from '@/lib/types/condition'

const TABS = [
  { label: 'All',              value: 'all' },
  { label: 'Pending Review',   value: 'pending_inspection' },
  { label: 'Report Locked',    value: 'locked' },
  { label: 'No Report',        value: 'none' },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function RatingPill({ rating }: { rating: ConditionRating | null | undefined }) {
  if (!rating) return <span className="text-xs text-[#a8a29e]">—</span>
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ratingBg(rating)}`}>
      {ratingLabel(rating)}
    </span>
  )
}

function InspectionBadge({ locked, status }: { locked: boolean; status: string }) {
  if (locked) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        Locked
      </span>
    )
  }
  if (status === 'pending_inspection') {
    return (
      <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-[#e7e5e4] bg-[#f5f4f0] px-2 py-0.5 text-xs font-medium text-[#78716c]">
      No Report
    </span>
  )
}

interface Row {
  id: string
  vin: string
  make: string
  model: string
  year: number
  status: string
  condition_locked: boolean
  created_at: string
  ai_condition_exterior:   { rating: ConditionRating } | null
  ai_condition_interior:   { rating: ConditionRating } | null
  ai_condition_mechanical: { rating: ConditionRating } | null
  ai_condition_tires:      { rating: ConditionRating } | null
  profiles: { company: string | null; full_name: string | null } | null
}

export default async function AdminInspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filter = params.filter ?? 'all'

  const supabase = createAdminClient()

  let query = supabase
    .from('listings')
    .select(`
      id, vin, make, model, year, status, condition_locked, created_at,
      ai_condition_exterior, ai_condition_interior, ai_condition_mechanical, ai_condition_tires,
      profiles!seller_id(company, full_name)
    `)
    .order('created_at', { ascending: false })

  if (filter === 'pending_inspection') {
    query = query.eq('status', 'pending_inspection')
  } else if (filter === 'locked') {
    query = query.eq('condition_locked', true)
  } else if (filter === 'none') {
    query = query.eq('condition_locked', false).neq('status', 'pending_inspection')
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch inspections: ${error.message}`)

  const rows = (data ?? []) as unknown as Row[]

  // Counts for each tab
  const { count: pendingCount } = await supabase
    .from('listings').select('*', { count: 'exact', head: true }).eq('status', 'pending_inspection')
  const { count: lockedCount } = await supabase
    .from('listings').select('*', { count: 'exact', head: true }).eq('condition_locked', true)

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1c1917]">Inspections</h1>

      {/* Summary strip */}
      <div className="mt-4 flex gap-4">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-yellow-700">{pendingCount ?? 0}</p>
          <p className="text-xs text-yellow-600 mt-0.5">Awaiting Review</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-700">{lockedCount ?? 0}</p>
          <p className="text-xs text-green-600 mt-0.5">Reports Locked</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-6 border-b border-[#e7e5e4]">
        {TABS.map((tab) => {
          const isActive = filter === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/inspections?filter=${tab.value}`}
              className={`pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-[#1d4ed8] text-[#1c1917]'
                  : 'text-[#78716c] hover:text-[#1c1917]'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Inspection form */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Submit Inspection Report</h2>
        <div className="overflow-hidden rounded-lg border border-[#e7e5e4] bg-white">
          <iframe
            src="https://docs.google.com/forms/d/e/1FAIpQLSdDMHRwk81mOkjj7L5YVmrTaRcu6tDe20cy9dfjXMC4boRGVQ/viewform?embedded=true"
            width="100%"
            height="900"
            frameBorder="0"
          >
            Loading…
          </iframe>
        </div>
      </div>

      {/* Table */}
      <div className="mt-8 overflow-hidden rounded-lg border border-[#e7e5e4] bg-white">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[#a8a29e]">No listings found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e7e5e4] bg-[#faf9f6] text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Vehicle</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">VIN</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Seller</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#78716c]">Report</th>
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
                      href={`/admin/inspections/${row.id}`}
                      className="font-medium text-[#1c1917] hover:underline"
                    >
                      {row.year} {row.make} {row.model}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#78716c]">{row.vin}</td>
                  <td className="px-4 py-3 text-[#78716c]">
                    {row.profiles?.company ?? row.profiles?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <InspectionBadge locked={row.condition_locked} status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <RatingPill rating={row.ai_condition_exterior?.rating} />
                  </td>
                  <td className="px-4 py-3">
                    <RatingPill rating={row.ai_condition_interior?.rating} />
                  </td>
                  <td className="px-4 py-3">
                    <RatingPill rating={row.ai_condition_mechanical?.rating} />
                  </td>
                  <td className="px-4 py-3">
                    <RatingPill rating={row.ai_condition_tires?.rating} />
                  </td>
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
