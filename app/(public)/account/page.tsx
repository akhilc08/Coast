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
      <h1 className="text-2xl font-bold text-zinc-100">Account</h1>

      <div className="mt-8 space-y-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Profile</p>

          {[
            ['Name', name],
            ['Email', user.email],
            ['Role', role],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-zinc-500">{label}</span>
              <span className="text-zinc-200">{value}</span>
            </div>
          ))}
        </div>

        {(role === 'wholesaler' || role === 'admin') && (
          <a
            href="/seller/dashboard"
            className="block rounded-lg border border-zinc-700 py-3 text-center text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            Go to Seller Dashboard
          </a>
        )}
      </div>
    </main>
  )
}
