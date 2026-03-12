'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { isValidDocumentMime } from '@/lib/storage'
import { createClient } from '@/lib/supabase/browser'
import { addDocumentAction } from '@/app/actions/listings'
import { toast } from 'sonner'

interface DocumentItem {
  id:           string
  storageKey:   string
  documentType: string
  fileName:     string
}

interface DocumentUploadProps {
  listingId:          string
  initialDocs:        { id: string; storage_key: string; document_type: string; file_name: string }[]
  lockedDocumentType?: string  // when set, hides the type select and uses this value
}

export function DocumentUpload({ listingId, initialDocs, lockedDocumentType }: DocumentUploadProps) {
  const [docs, setDocs] = useState<DocumentItem[]>(
    initialDocs.map(d => ({
      id:           d.id,
      storageKey:   d.storage_key,
      documentType: d.document_type,
      fileName:     d.file_name,
    }))
  )
  const [docType, setDocType] = useState(lockedDocumentType ?? 'carfax')
  const [uploading, setUploading] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (!file) return
      if (!isValidDocumentMime(file.type)) {
        toast.error('Only PDF files are accepted')
        return
      }

      setUploading(true)
      try {
        const supabase = createClient()
        const storageKey = `${listingId}/docs/${crypto.randomUUID()}.pdf`

        const { error } = await supabase.storage
          .from('car-documents')
          .upload(storageKey, file, { contentType: 'application/pdf', cacheControl: '3600', upsert: false })
        if (error) throw error

        const result = await addDocumentAction(listingId, storageKey, docType, file.name)
        if ('error' in result) throw new Error(result.error)

        setDocs(prev => [...prev, {
          id:           crypto.randomUUID(),
          storageKey,
          documentType: docType,
          fileName:     file.name,
        }])
        toast.success('Document uploaded')
      } catch {
        toast.error('Failed to upload document')
      } finally {
        setUploading(false)
      }
    },
  })

  return (
    <div className="space-y-4">
      {!lockedDocumentType && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-[#78716c]">Document type:</label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="rounded-md border border-[#e7e5e4] bg-white px-3 py-1.5 text-sm text-[#1c1917] focus:border-blue-600 focus:outline-none"
          >
            <option value="carfax">Carfax</option>
            <option value="service_history">Service History</option>
            <option value="title">Title</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-[#e7e5e4] hover:border-[#a8a29e]'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-[#78716c]">
          {uploading ? 'Uploading...' : isDragActive ? 'Drop PDF here' : 'Drag & drop a PDF, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-[#a8a29e]">PDF only · Max 10 MB</p>
      </div>

      {docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map(doc => (
            <li key={doc.id} className="flex items-center gap-2 rounded-md border border-[#e7e5e4] bg-[#fafaf9] px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#a8a29e]">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="flex-1 truncate text-sm text-[#1c1917]">{doc.fileName}</span>
              <span className="text-xs text-[#a8a29e]">{doc.documentType.replace('_', ' ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
