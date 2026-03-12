'use client'

import { DocumentUpload } from '@/components/listings/DocumentUpload'
import { Button } from '@/components/ui/button'

interface StepDocumentsProps {
  listingId: string
  initialDocs: { id: string; storage_key: string; document_type: string; file_name: string }[]
  onSave: () => void
}

export function StepDocuments({ listingId, initialDocs, onSave }: StepDocumentsProps) {
  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Documents</h2>
      <p className="mb-2 text-sm text-[#78716c]">Upload supporting documents such as Carfax, service history, or title. This step is optional.</p>
      <p className="mb-6 text-xs text-[#a8a29e]">You can publish the listing without uploading documents.</p>

      <DocumentUpload listingId={listingId} initialDocs={initialDocs} />

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          className="flex-1 border-[#e7e5e4] text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]"
        >
          Skip this step
        </Button>
        <Button
          type="button"
          onClick={onSave}
          className="flex-1 bg-blue-600 text-white hover:bg-blue-500"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
