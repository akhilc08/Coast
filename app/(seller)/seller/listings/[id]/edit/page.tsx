import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ListingWizard } from '@/components/listings/wizard/ListingWizard'

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      *,
      listing_photos(id, storage_key, position, slot_type),
      listing_documents(id, storage_key, document_type, file_name)
    `)
    .eq('id', id)
    .eq('seller_id', user.id)
    .single()

  if (!listing) notFound()

  return <ListingWizard initialData={listing} listingId={id} />
}
