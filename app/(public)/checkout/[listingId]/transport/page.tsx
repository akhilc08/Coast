// app/(public)/checkout/[listingId]/transport/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransportForm } from '@/components/checkout/TransportForm'

interface Props {
  params: Promise<{ listingId: string }>
}

export default async function TransportPage({ params }: Props) {
  const { listingId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login`)

  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, year, make, model, price_cents, status, listing_photos(storage_key, position)')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()

  if (!listing) notFound()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const heroPhoto   = ((listing.listing_photos as { storage_key: string; position: number }[]) ?? [])
    .sort((a, b) => a.position - b.position)[0]
  const heroUrl     = heroPhoto
    ? `${supabaseUrl}/storage/v1/object/public/car-photos/${heroPhoto.storage_key}`
    : null

  const vehicleTitle =
    listing.title ??
    [listing.year, listing.make, listing.model].filter(Boolean).join(' ') ??
    'Vehicle'

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <TransportForm
        listingId={listing.id}
        vehicleTitle={vehicleTitle}
        priceCents={listing.price_cents ?? 0}
        heroUrl={heroUrl}
      />
    </main>
  )
}
