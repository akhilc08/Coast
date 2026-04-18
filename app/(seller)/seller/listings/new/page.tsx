import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListingWizard } from '@/components/listings/wizard/ListingWizard'

export default async function NewListingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('seller_tier')
    .eq('id', user.id)
    .single()

  return (
    <ListingWizard
      sellerTier={(profile?.seller_tier as number) ?? 1}
    />
  )
}
