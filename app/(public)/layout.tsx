import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role as string | undefined

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917]">
      <header className="sticky top-0 z-40 border-b border-[#e7e5e4] bg-[#faf9f6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="[font-family:var(--font-serif-display)] text-xl text-[#1c1917] tracking-tight"
            >
              Coast
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/inventory"
                className="text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
              >
                Inventory
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {role === 'admin' && (
                  <Link
                    href="/admin"
                    className="text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
                  >
                    Admin
                  </Link>
                )}
                {role === 'consumer' && (
                  <Link
                    href="/account/orders"
                    className="text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
                  >
                    My Orders
                  </Link>
                )}
                <Link
                  href="/account"
                  className="text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
                >
                  Account
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-[#1c1917] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#292524]"
                >
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
