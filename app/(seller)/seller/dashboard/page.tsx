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
        <h1 className="text-2xl font-semibold text-[#1c1917]">My Listings</h1>
        <Link href="/seller/listings/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          + New Listing
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#a8a29e]">Published ({active.length})</h2>
        {active.length === 0 ? (
          <p className="text-sm text-[#a8a29e]">No published listings yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#e7e5e4]">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f6]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#78716c]">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium text-[#78716c]">Price</th>
                  <th className="px-4 py-3 text-right font-medium text-[#78716c]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e5e4]">
                {active.map(listing => (
                  <tr key={listing.id} className="bg-white hover:bg-[#faf9f6]">
                    <td className="px-4 py-3 text-[#1c1917]">
                      {listing.year} {listing.make} {listing.model}
                      <span className="ml-2 text-xs text-[#a8a29e]">{listing.vin}</span>
                    </td>
                    <td className="px-4 py-3 text-[#78716c]">
                      {listing.price_cents ? `$${(listing.price_cents / 100).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/seller/listings/${listing.id}/edit`} className="mr-3 text-blue-600 hover:text-blue-500 text-xs">Edit</Link>
                      <form action={async () => { 'use server'; await archiveListingAction(listing.id) }} className="inline">
                        <button type="submit" className="text-[#a8a29e] hover:text-[#78716c] text-xs">Archive</button>
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
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#a8a29e]">Drafts ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-[#a8a29e]">No draft listings.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#e7e5e4]">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f6]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#78716c]">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium text-[#78716c]">VIN</th>
                  <th className="px-4 py-3 text-right font-medium text-[#78716c]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e5e4]">
                {drafts.map(listing => (
                  <tr key={listing.id} className="bg-white hover:bg-[#faf9f6]">
                    <td className="px-4 py-3 text-[#1c1917]">
                      {listing.year && listing.make ? `${listing.year} ${listing.make} ${listing.model}` : 'Draft listing'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#a8a29e]">{listing.vin ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/seller/listings/${listing.id}/edit`} className="mr-3 text-blue-600 hover:text-blue-500 text-xs">Continue</Link>
                      <form action={async () => { 'use server'; await publishListingAction(listing.id) }} className="inline">
                        <button type="submit" className="text-emerald-600 hover:text-emerald-500 text-xs">Publish</button>
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
