import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminNav } from './AdminNav'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.app_metadata?.role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen bg-[#faf9f6] text-[#1c1917]">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-[#e7e5e4] bg-white">
        <div className="px-6 py-5">
          <span className="[font-family:var(--font-serif-display)] text-base text-[#1c1917]">Coast Admin</span>
        </div>
        <AdminNav />
        <div className="mt-auto border-t border-[#e7e5e4] p-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#78716c] transition-colors hover:bg-[#faf9f6] hover:text-[#1c1917]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Site
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
