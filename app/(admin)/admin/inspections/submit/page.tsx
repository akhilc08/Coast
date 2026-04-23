import Link from 'next/link'
import { InspectionForm } from '@/components/admin/InspectionForm'

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdDMHRwk81mOkjj7L5YVmrTaRcu6tDe20cy9dfjXMC4boRGVQ/viewform'

export default function SubmitInspectionPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/inspections" className="text-sm text-[#78716c] hover:text-[#1c1917]">
          &larr; Inspections
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-[#1c1917] mb-6">Submit Inspection Report</h1>

      {/* Two options */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border-2 border-[#1d4ed8] bg-blue-50 p-5">
          <p className="text-sm font-semibold text-[#1c1917] mb-1">Fill out here</p>
          <p className="text-xs text-[#78716c] mb-4">Submit the inspection report directly on this page.</p>
          <span className="inline-block rounded-lg bg-[#1d4ed8] px-3 py-1.5 text-xs font-semibold text-white">
            Native Form ↓
          </span>
        </div>

        <a
          href={GOOGLE_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border-2 border-[#e7e5e4] bg-white p-5 hover:border-[#a8a29e] transition-colors block"
        >
          <p className="text-sm font-semibold text-[#1c1917] mb-1">Use Google Form</p>
          <p className="text-xs text-[#78716c] mb-4">Opens in a new tab. Data is saved automatically via webhook.</p>
          <span className="inline-block rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-3 py-1.5 text-xs font-medium text-[#78716c]">
            Open Google Form ↗
          </span>
        </a>
      </div>

      {/* Native form */}
      <div className="rounded-lg border border-[#e7e5e4] bg-white p-6">
        <InspectionForm />
      </div>
    </div>
  )
}
