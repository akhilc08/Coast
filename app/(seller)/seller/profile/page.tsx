import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { updateSellerBioAction } from '@/app/actions/profile'

export default async function SellerProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company, bio')
    .eq('id', user.id)
    .single()

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
        <div className="flex justify-between text-sm border-b border-[#f5f5f4] pb-4">
          <span className="text-[#78716c]">Name</span>
          <span className="font-medium text-[#1c1917]">{profile?.full_name ?? '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#78716c]">Company</span>
          <span className="font-medium text-[#1c1917]">{profile?.company ?? '—'}</span>
        </div>
      </div>

      {/* Bio editor */}
      <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
        <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-[#a8a29e]">About You</h2>
        <p className="mb-5 text-sm text-[#78716c]">
          Write a short description about your dealership or business. This appears on your public seller page.
        </p>
        <form
          action={async (formData: FormData) => {
            'use server'
            await updateSellerBioAction(formData.get('bio') as string ?? '')
          }}
          className="space-y-4"
        >
          <textarea
            name="bio"
            defaultValue={profile?.bio ?? ''}
            rows={5}
            maxLength={600}
            placeholder="e.g. Family-owned dealership serving the Dallas area since 2005. We specialize in clean pre-owned domestic trucks and SUVs..."
            className="w-full rounded-lg border border-[#e7e5e4] bg-white px-4 py-3 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-500 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#a8a29e]">Max 600 characters</p>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
