import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminConditionUpload } from '@/components/admin/AdminConditionUpload'
import { AdminConditionForm } from '@/components/admin/AdminConditionForm'
import { AdminApproveButton } from '@/components/admin/AdminApproveButton'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import type { AiConditionData } from '@/lib/types/condition'

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      id, vin, make, model, year, status, condition_locked,
      ai_condition_exterior, ai_condition_interior, ai_condition_mechanical, ai_condition_tires,
      profiles!seller_id(full_name, company)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to load listing: ${error.message}`)
  if (!listing) notFound()

  const profile = (Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles) as { full_name: string | null; company: string | null } | null

  const aiCondition: AiConditionData | null = (listing as Record<string, unknown>).ai_condition_exterior
    ? {
        exterior:   (listing as Record<string, unknown>).ai_condition_exterior as AiConditionData['exterior'],
        interior:   (listing as Record<string, unknown>).ai_condition_interior as AiConditionData['interior'],
        mechanical: (listing as Record<string, unknown>).ai_condition_mechanical as AiConditionData['mechanical'],
        tires:      (listing as Record<string, unknown>).ai_condition_tires as AiConditionData['tires'],
      }
    : null

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/inspections" className="text-sm text-[#78716c] hover:text-[#1c1917]">
          &larr; Inspections
        </Link>
        <Link href={`/admin/listings/${listing.id}`} className="text-sm text-[#78716c] hover:text-[#1c1917]">
          View full listing &rarr;
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1917]">
            {listing.year} {listing.make} {listing.model}
          </h1>
          <p className="mt-1 font-mono text-sm text-[#78716c]">{listing.vin}</p>
          {(profile?.company ?? profile?.full_name) && (
            <p className="mt-0.5 text-sm text-[#a8a29e]">{profile?.company ?? profile?.full_name}</p>
          )}
        </div>
        {listing.status === 'pending_inspection' && (
          <AdminApproveButton listingId={listing.id} />
        )}
      </div>

      {listing.status === 'pending_inspection' && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm font-semibold text-yellow-800">Pending Inspection</p>
          <p className="mt-0.5 text-xs text-yellow-600">
            This listing is awaiting inspection and approval before going live.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-8">

        {/* Submit inspection */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Submit Inspection</h2>
          <div className="rounded-lg border border-[#e7e5e4] bg-white p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-[#1c1917] mb-1">Fill out yourself</p>
              <p className="text-xs text-[#a8a29e] mb-3">Submit the condition report directly from this admin panel.</p>
              <Link
                href="/admin/inspections/submit"
                className="inline-block rounded-lg bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
              >
                Open Inspection Form
              </Link>
            </div>
            <div className="border-t border-[#e7e5e4] pt-4">
              <p className="text-sm font-medium text-[#1c1917] mb-1">Share with inspector</p>
              <p className="text-xs text-[#a8a29e] mb-3">Send this link to your inspector — they fill it out externally and the data is saved automatically.</p>
              <CopyLinkButton />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Inspection Report</h2>
          <AdminConditionUpload listingId={listing.id} alreadyLocked={!!listing.condition_locked} />
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-[#1c1917]">Condition Data</h2>
          <div className="rounded-lg border border-[#e7e5e4] bg-white p-6">
            <AdminConditionForm listingId={listing.id} initial={aiCondition} />
          </div>
        </div>
      </div>
    </div>
  )
}
