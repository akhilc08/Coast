import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleFormPicker } from './GoogleFormPicker'

export default async function GoogleFormSubmitPage() {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('listings')
    .select('id, year, make, model, vin, status')
    .in('status', ['active', 'pending_inspection'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch listings: ${error.message}`)

  const listings = (data ?? []) as {
    id: string
    year: number
    make: string
    model: string
    vin: string
    status: string
  }[]

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/inspections/submit" className="text-sm text-[#78716c] hover:text-[#1c1917]">
          &larr; Back
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-[#1c1917] mb-2">Send Google Form to Inspector</h1>
      <p className="text-sm text-[#78716c] mb-8">
        Select a vehicle to generate a pre-filled Google Form link with the VIN already filled in.
      </p>
      <GoogleFormPicker listings={listings} />
    </div>
  )
}
