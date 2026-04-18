import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { BanToggleButton } from './BanToggleButton'
import { CreateWholesalerForm } from './CreateWholesalerForm'
import { SetSellerTierButton } from './SetSellerTierButton'

interface SearchParams {
  status?: string
}

type UserRole = 'admin' | 'wholesaler' | 'consumer'

interface MergedUser {
  id: string
  email: string
  role: UserRole
  company: string | null
  sellerTier: number
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

  // Fetch users via RPC (joins auth.users + profiles server-side)
  const { data: rows, error } = await admin.rpc('get_admin_users')

  if (error) {
    console.error('get_admin_users error:', error)
  }

  const mergedUsers: MergedUser[] = (rows ?? []).map((row: { id: string; email: string; role: string; company: string | null; seller_tier: number | null; banned_until: string | null; created_at: string }) => ({
    id: row.id,
    email: row.email ?? '',
    role: (row.role as UserRole) ?? 'consumer',
    company: row.company ?? null,
    sellerTier: row.seller_tier ?? 1,
    isBanned: !!row.banned_until && new Date(row.banned_until) > new Date(),
    createdAt: row.created_at,
  }))

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
    <div className="min-h-full space-y-8">
      <h1 className="text-2xl font-bold text-[#1c1917]">Users</h1>

      {/* Create Wholesaler form */}
      <div className="max-w-md">
        <CreateWholesalerForm />
      </div>

      {/* Filter tabs */}
      <div className="border-b border-[#e7e5e4]">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/users?status=${tab.value}`}
              className={
                activeTab === tab.value
                  ? 'pb-3 text-sm font-medium text-[#1c1917] border-b-2 border-[#1d4ed8]'
                  : 'pb-3 text-sm font-medium text-[#78716c] hover:text-[#1c1917]'
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* User table */}
      <div className="rounded-lg border border-[#e7e5e4] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e7e5e4] bg-[#faf9f6]">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#78716c]">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#78716c]">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#78716c]">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#78716c]">
                Tier
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#78716c]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#78716c]">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#78716c]">
                Tier
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#78716c]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-[#a8a29e]"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[#e7e5e4] last:border-0 hover:bg-[#faf9f6]"
                >
                  <td className="px-4 py-3 text-[#1c1917] font-medium">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        user.role === 'wholesaler'
                          ? 'text-xs rounded-full px-2 py-0.5 border border-blue-200 bg-blue-50 text-blue-700'
                          : user.role === 'admin'
                            ? 'text-xs rounded-full px-2 py-0.5 border border-purple-200 bg-purple-50 text-purple-700'
                            : 'text-xs rounded-full px-2 py-0.5 border border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]'
                      }
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#78716c]">
                    {user.company ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {user.sellerTier ? (
                      <span className={`text-xs rounded-full px-2 py-0.5 border ${
                        user.sellerTier >= 2
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-[#e7e5e4] bg-[#f5f4f0] text-[#78716c]'
                      }`}>
                        {user.sellerTier >= 2 ? 'Trusted' : 'Standard'}
                      </span>
                    ) : (
                      <span className="text-xs text-[#a8a29e]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.isBanned ? (
                      <span className="text-red-600 text-xs font-medium">Banned</span>
                    ) : (
                      <span className="text-green-700 text-xs font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#78716c]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === 'wholesaler' ? (
                      <SetSellerTierButton userId={user.id} currentTier={user.sellerTier} />
                    ) : (
                      <span className="text-xs text-[#a8a29e]">—</span>
                    )}
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
