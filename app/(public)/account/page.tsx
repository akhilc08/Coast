import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Account — Coast' }

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.app_metadata?.role ?? 'consumer'
  const name = user.user_metadata?.full_name ?? user.email

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-[#1c1917]">Account</h1>

      <div className="mt-8 space-y-6">
        <div className="rounded-lg border border-[#e7e5e4] bg-white p-6 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[#a8a29e]">Profile</p>

          {[
            ['Name', name],
            ['Email', user.email],
            ['Role', role],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-[#a8a29e]">{label}</span>
              <span className="text-[#1c1917]">{value}</span>
            </div>
          ))}
        </div>

        {(role === 'wholesaler' || role === 'admin') && (
          <a
            href="/seller/dashboard"
            className="block rounded-lg border border-[#e7e5e4] py-3 text-center text-sm text-[#57534e] transition-colors hover:border-[#a8a29e] hover:text-[#1c1917]"
          >
            Go to Seller Dashboard
          </a>
        )}
      </div>
    </main>
  )
}
