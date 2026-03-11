import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminNav } from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.app_metadata?.role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-zinc-800">
        <div className="px-6 py-5">
          <span className="text-base font-semibold text-zinc-100">Coast Admin</span>
        </div>
        <AdminNav />
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
