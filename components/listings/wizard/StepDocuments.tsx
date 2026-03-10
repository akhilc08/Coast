'use client'

import { DocumentUpload } from '@/components/listings/DocumentUpload'
import { Button } from '@/components/ui/button'

interface StepDocumentsProps {
  listingId: string
  initialDocs: { id: string; storage_key: string; document_type: string; original_name: string }[]
  onSave: () => void
}

export function StepDocuments({ listingId, initialDocs, onSave }: StepDocumentsProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-1 text-xl font-semibold text-zinc-100">Documents</h2>
      <p className="mb-2 text-sm text-zinc-400">Upload supporting documents such as Carfax, service history, or title. This step is optional.</p>
      <p className="mb-6 text-xs text-zinc-600">You can publish the listing without uploading documents.</p>

      <DocumentUpload listingId={listingId} initialDocs={initialDocs} />

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          className="flex-1 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
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
