import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { ListingsTable } from '@/components/admin/ListingsTable'

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Pending Inspection', value: 'pending_inspection' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sold', value: 'sold' },
]

interface Listing {
  id: string
  vin: string
  make: string
  model: string
  year: number
  price_cents: number
  status: string
  overall_grade: string | null
  created_at: string
  profiles: { company: string | null } | null
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const status = params.status ?? 'all'

  const supabase = createAdminClient()
  let query = supabase
    .from('listings')
    .select('id, vin, make, model, year, price_cents, status, overall_grade, created_at, profiles!seller_id(company)')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: listings, error } = await query
  if (error) throw new Error(`Failed to fetch listings: ${error.message}`)

  const rows = (listings ?? []) as unknown as Listing[]

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1c1917]">Listings</h1>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-6 border-b border-[#e7e5e4]">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/listings?status=${tab.value}`}
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

      <div className="mt-4">
        <ListingsTable rows={rows} />
      </div>
    </div>
  )
}
