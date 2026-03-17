import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BioEditor } from '@/components/seller/BioEditor'

export default async function SellerProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company, bio')
    .eq('id', user.id)
    .single()

  const company =
    profile?.company ??
    (user.user_metadata?.company as string | undefined) ??
    '—'

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#1c1917]">Seller Profile</h1>
        <p className="mt-1 text-sm text-[#78716c]">
          Your public profile is visible to buyers browsing your listings.
        </p>
      </div>

      {/* Read-only identity */}
      <div className="rounded-xl border border-[#e7e5e4] bg-white p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#a8a29e]">Identity</h2>
        <div className="flex justify-between text-sm">
          <span className="text-[#78716c]">Company</span>
          <span className="font-medium text-[#1c1917]">{company}</span>
        </div>
      </div>

      {/* Bio editor */}
      <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
        <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-[#a8a29e]">About You</h2>
        <p className="mb-5 text-sm text-[#78716c]">
          Write a short description about your dealership or business. This appears on your public seller page.
        </p>
        <BioEditor initialBio={profile?.bio ?? ''} />
      </div>
    </div>
  )
}
