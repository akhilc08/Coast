import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role as string | undefined

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold text-zinc-100">
              Coast
            </Link>
            <Link href="/inventory" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">
              Inventory
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {role === 'consumer' && (
                  <Link href="/account/orders" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">
                    My Orders
                  </Link>
                )}
                <Link href="/account" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">
                  Account
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">Log in</Link>
                <Link href="/signup" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
