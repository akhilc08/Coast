import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { BanToggleButton } from './BanToggleButton'
import { CreateWholesalerForm } from './CreateWholesalerForm'

interface SearchParams {
  status?: string
}

type UserRole = 'admin' | 'wholesaler' | 'consumer'

interface MergedUser {
  id: string
  email: string
  role: UserRole
  company: string | null
  isBanned: boolean
  createdAt: string
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { status } = await searchParams
  const admin = createAdminClient()

  // Fetch auth users and profiles in parallel
  const [{ data: authData }, { data: profileRows }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 50 }),
    admin.from('profiles').select('id, role, company, created_at'),
  ])

  const authUsers = authData?.users ?? []
  const profileMap = new Map(
    (profileRows ?? []).map((p) => [p.id, p])
  )

  // Merge auth users with profile data
  const mergedUsers: MergedUser[] = authUsers
    .filter((u) => profileMap.has(u.id))
    .map((u) => {
      const profile = profileMap.get(u.id)!
      return {
        id: u.id,
        email: u.email ?? '',
        role: (profile.role as UserRole) ?? 'consumer',
        company: profile.company ?? null,
        isBanned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        createdAt: profile.created_at ?? u.created_at,
      }
    })

  // Filter by role tab
  const filtered =
    !status || status === 'all'
      ? mergedUsers
      : mergedUsers.filter((u) => u.role === status)

  const tabs: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Consumers', value: 'consumer' },
    { label: 'Wholesalers', value: 'wholesaler' },
  ]

  const activeTab = status || 'all'

  return (
    <div className="bg-zinc-950 min-h-full text-zinc-50 space-y-8">
      <h1 className="text-2xl font-bold text-zinc-50">Users</h1>

      {/* Create Wholesaler form */}
      <div className="max-w-md">
        <CreateWholesalerForm />
      </div>

      {/* Filter tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/users?status=${tab.value}`}
              className={
                activeTab === tab.value
                  ? 'pb-3 text-sm font-medium text-zinc-50 border-b-2 border-blue-500'
                  : 'pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-300'
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* User table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-zinc-400 font-medium">
                Email
              </th>
              <th className="px-4 py-3 text-left text-zinc-400 font-medium">
                Role
              </th>
              <th className="px-4 py-3 text-left text-zinc-400 font-medium">
                Company
              </th>
              <th className="px-4 py-3 text-left text-zinc-400 font-medium">
                Status
              </th>
              <th className="px-4 py-3 text-left text-zinc-400 font-medium">
                Created
              </th>
              <th className="px-4 py-3 text-left text-zinc-400 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3 text-zinc-50">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        user.role === 'wholesaler'
                          ? 'text-xs rounded-full px-2 py-0.5 bg-blue-900 text-blue-200'
                          : user.role === 'admin'
                            ? 'text-xs rounded-full px-2 py-0.5 bg-purple-900 text-purple-200'
                            : 'text-xs rounded-full px-2 py-0.5 bg-zinc-800 text-zinc-300'
                      }
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {user.company ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {user.isBanned ? (
                      <span className="text-red-400">Banned</span>
                    ) : (
                      <span className="text-green-400">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {user.role !== 'admin' && (
                      <BanToggleButton
                        userId={user.id}
                        isBanned={user.isBanned}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
