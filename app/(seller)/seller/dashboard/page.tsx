import { createClient } from '@/lib/supabase/server'
import { SellerDashboard } from '@/components/seller/SellerDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Fetch all listings with first photo
  const { data: listings } = await supabase
    .from('listings')
    .select('id, vin, make, model, year, price_cents, status, created_at, listing_photos(storage_key, position)')
    .eq('seller_id', user!.id)
    .in('status', ['active', 'draft', 'paused', 'pending_inspection', 'archived'])
    .order('created_at', { ascending: false })

  // Fetch sold listings with order data
  const { data: soldOrders } = await supabase
    .from('orders')
    .select('id, price_cents, created_at, transport_status, listings(id, vin, make, model, year, price_cents, status, created_at, listing_photos(storage_key, position))')
    .eq('seller_id', user!.id)
    .in('status', ['paid', 'documents_sent', 'documents_signed', 'complete'])
    .order('created_at', { ascending: false })

  // Fetch seller profile for tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('seller_tier')
    .eq('id', user!.id)
    .single()

  // Fetch unread notification count
  const { count: notifCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('read', false)

  function getHeroUrl(photos: { storage_key: string; position: number }[] | null): string | null {
    if (!photos || photos.length === 0) return null
    const sorted = [...photos].sort((a, b) => a.position - b.position)
    return `${supabaseUrl}/storage/v1/object/public/car-photos/${sorted[0].storage_key}`
  }

  const dashboardListings = (listings ?? []).map(l => ({
    id: l.id,
    vin: l.vin,
    make: l.make,
    model: l.model,
    year: l.year,
    price_cents: l.price_cents,
    status: l.status as 'active' | 'draft' | 'paused' | 'pending_inspection' | 'sold' | 'archived',
    created_at: l.created_at,
    hero_url: getHeroUrl(l.listing_photos as { storage_key: string; position: number }[]),
  }))

  const soldListings = (soldOrders ?? []).map(o => {
    const listing = o.listings as unknown as { id: string; vin: string | null; make: string | null; model: string | null; year: number | null; price_cents: number | null; status: string; created_at: string; listing_photos: { storage_key: string; position: number }[] } | null
    return {
      id: listing?.id ?? o.id,
      vin: listing?.vin ?? null,
      make: listing?.make ?? null,
      model: listing?.model ?? null,
      year: listing?.year ?? null,
      price_cents: listing?.price_cents ?? null,
      status: 'sold' as const,
      created_at: listing?.created_at ?? o.created_at,
      hero_url: getHeroUrl(listing?.listing_photos ?? null),
      sale_price_cents: o.price_cents,
      sale_date: o.created_at,
      transport_status: o.transport_status,
    }
  })

  return (
    <SellerDashboard
      listings={dashboardListings}
      soldListings={soldListings}
      sellerTier={(profile?.seller_tier as 'beginner' | 'trusted') ?? 'beginner'}
      notificationCount={notifCount ?? 0}
    />
  )
}
