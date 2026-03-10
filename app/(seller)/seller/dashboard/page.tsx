import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { archiveListingAction, publishListingAction } from '@/app/actions/listings'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listings } = await supabase
    .from('listings')
    .select('id, vin, make, model, year, price_cents, status, created_at')
    .eq('seller_id', user!.id)
    .order('created_at', { ascending: false })

  const active = listings?.filter(l => l.status === 'active') ?? []
  const drafts = listings?.filter(l => l.status === 'draft') ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">My Listings</h1>
        <Link href="/seller/listings/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          + New Listing
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">Published ({active.length})</h2>
        {active.length === 0 ? (
          <p className="text-sm text-zinc-600">No published listings yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Price</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {active.map(listing => (
                  <tr key={listing.id} className="bg-zinc-950">
                    <td className="px-4 py-3 text-zinc-100">
                      {listing.year} {listing.make} {listing.model}
                      <span className="ml-2 text-xs text-zinc-500">{listing.vin}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {listing.price_cents ? `$${(listing.price_cents / 100).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/seller/listings/${listing.id}/edit`} className="mr-3 text-blue-400 hover:text-blue-300 text-xs">Edit</Link>
                      <form action={async () => { 'use server'; await archiveListingAction(listing.id) }} className="inline">
                        <button type="submit" className="text-zinc-500 hover:text-zinc-300 text-xs">Archive</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">Drafts ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-zinc-600">No draft listings.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">VIN</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {drafts.map(listing => (
                  <tr key={listing.id} className="bg-zinc-950">
                    <td className="px-4 py-3 text-zinc-100">
                      {listing.year && listing.make ? `${listing.year} ${listing.make} ${listing.model}` : 'Draft listing'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{listing.vin ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/seller/listings/${listing.id}/edit`} className="mr-3 text-blue-400 hover:text-blue-300 text-xs">Continue</Link>
                      <form action={async () => { 'use server'; await publishListingAction(listing.id) }} className="inline">
                        <button type="submit" className="text-emerald-500 hover:text-emerald-400 text-xs">Publish</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
