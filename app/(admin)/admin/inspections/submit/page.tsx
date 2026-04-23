import Link from 'next/link'

export default function SubmitInspectionPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/inspections" className="text-sm text-[#78716c] hover:text-[#1c1917]">
          &larr; Inspections
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-[#1c1917] mb-6">Submit Inspection Report</h1>
      <div className="rounded-lg border border-[#e7e5e4] bg-white overflow-hidden">
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLSdDMHRwk81mOkjj7L5YVmrTaRcu6tDe20cy9dfjXMC4boRGVQ/viewform?embedded=true"
          width="100%"
          height="900"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
        >
          Loading…
        </iframe>
      </div>
    </div>
  )
}
