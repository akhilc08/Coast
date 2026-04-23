import Link from 'next/link'
import { InspectionForm } from '@/components/admin/InspectionForm'

export default function SubmitInspectionPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/inspections" className="text-sm text-[#78716c] hover:text-[#1c1917]">
          &larr; Inspections
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-[#1c1917] mb-6">Submit Inspection Report</h1>
      <div className="rounded-lg border border-[#e7e5e4] bg-white p-6">
        <InspectionForm />
      </div>
    </div>
  )
}
