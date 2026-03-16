import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <header className="sticky top-0 z-40 flex h-[60px] items-center gap-8 border-b border-[#e5e7eb] bg-white px-8">

        {/* Logo */}
        <Link href="/" className="shrink-0 text-[22px] font-extrabold tracking-tight text-[#111]">
          Coast<span className="text-[#2563eb]">.</span>
        </Link>

        {/* Right nav */}
        <nav className="ml-auto flex items-center gap-6">
          <Link href="/inventory" className="hidden text-sm font-medium text-[#6b7280] hover:text-[#111] md:block">
            Browse
          </Link>
          <Link href="/sellers" className="hidden text-sm font-medium text-[#6b7280] hover:text-[#111] md:block">
            Sellers
          </Link>
          <a href="#how-it-works" className="hidden text-sm font-medium text-[#6b7280] hover:text-[#111] md:block">
            How It Works
          </a>

          {user ? (
            <>
              {role === 'admin' && (
                <Link href="/admin" className="text-sm font-medium text-[#6b7280] hover:text-[#111]">Admin</Link>
              )}
              {role === 'consumer' && (
                <Link href="/account/orders" className="text-sm font-medium text-[#6b7280] hover:text-[#111]">My Orders</Link>
              )}
              <Link href="/account" className="text-sm font-medium text-[#6b7280] hover:text-[#111]">Account</Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/signup"
              className="rounded-lg bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
            >
              Get Started
            </Link>
          )}
        </nav>

      </header>
      {children}
    </div>
  )
}
