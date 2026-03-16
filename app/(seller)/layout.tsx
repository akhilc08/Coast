import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917]">
      <header className="border-b border-[#e7e5e4] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-[#1c1917]">Coast</Link>
          <nav className="flex items-center gap-4">
            <Link href="/seller/dashboard" className="text-sm text-[#78716c] hover:text-[#1c1917] transition-colors">
              Dashboard
            </Link>
            <Link href="/seller/profile" className="text-sm text-[#78716c] hover:text-[#1c1917] transition-colors">
              Profile
            </Link>
            <Link href="/seller/listings/new" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
              New Listing
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
