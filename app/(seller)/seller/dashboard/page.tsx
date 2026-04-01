import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DashboardListings } from '@/components/seller/DashboardListings'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listings } = await supabase
    .from('listings')
    .select('id, vin, make, model, year, price_cents, status, created_at, listing_photos(id, storage_key, position)')
    .eq('seller_id', user!.id)
    .order('created_at', { ascending: false })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const active             = listings?.filter(l => l.status === 'active')            ?? []
  const pendingInspection  = listings?.filter(l => l.status === 'pending_inspection') ?? []
  const paused             = listings?.filter(l => l.status === 'paused')             ?? []
  const drafts             = listings?.filter(l => l.status === 'draft')              ?? []
  const sold               = listings?.filter(l => l.status === 'sold')               ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#1c1917]">My Listings</h1>
      </div>

      <DashboardListings
        active={active}
        pendingInspection={pendingInspection}
        paused={paused}
        drafts={drafts}
        sold={sold}
        supabaseUrl={supabaseUrl}
      />
    </div>
  )
}
