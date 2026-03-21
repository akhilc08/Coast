'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/browser'
import type { AiConditionData } from '@/lib/types/condition'

interface StepConditionProps {
  listingId:     string
  onAiExtracted: (data: AiConditionData, storageKey: string, fileName: string) => void
  // kept for wizard compat when listing already has locked condition
  alreadyLocked?: boolean
  onSkipToReview?: () => void
}

export function StepCondition({ listingId, onAiExtracted, alreadyLocked, onSkipToReview }: StepConditionProps) {
  const [file, setFile]           = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState<'idle' | 'uploading' | 'analyzing'>('idle')
  const [error, setError]         = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (f) { setFile(f); setError(null) }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept:   { 'application/pdf': ['.pdf'] },
    multiple: false,
    maxSize:  20 * 1024 * 1024,
    onDrop,
    onDropRejected: () => setError('Only PDF files up to 20 MB are accepted'),
  })

  async function handleAnalyze() {
    if (!file) return
    setError(null)
    setUploading(true)
    setProgress('uploading')

    try {
      const supabase   = createClient()
      const storageKey = `${listingId}/docs/${crypto.randomUUID()}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('car-documents')
        .upload(storageKey, file, { contentType: 'application/pdf', cacheControl: '3600', upsert: false })

      if (uploadError) throw new Error(uploadError.message)

      setProgress('analyzing')

      const formData = new FormData()
      formData.append('storageKey', storageKey)
      formData.append('listingId', listingId)

      const res = await fetch('/api/condition/extract', { method: 'POST', body: formData })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'AI extraction failed')
      }

      const { data } = await res.json()
      onAiExtracted(data, storageKey, file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setUploading(false)
      setProgress('idle')
    }
  }

  if (alreadyLocked) {
    return (
      <div>
        <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Condition Report</h2>
        <p className="mb-6 text-sm text-[#78716c]">This listing's condition has already been extracted and locked.</p>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex items-center gap-3">
          <span className="text-green-600 text-xl">✓</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Condition locked</p>
            <p className="text-xs text-green-600 mt-0.5">AI-extracted condition data is saved and cannot be changed.</p>
          </div>
        </div>
        {onSkipToReview && (
          <button
            onClick={onSkipToReview}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            View Condition Report
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Upload Inspection Report</h2>
      <p className="mb-6 text-sm text-[#78716c]">
        Upload the vehicle inspection PDF. Claude will automatically extract all condition details.
        Once confirmed, this cannot be edited.
      </p>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : file
            ? 'border-green-400 bg-green-50'
            : 'border-[#e7e5e4] hover:border-[#a8a29e]'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-[#1c1917]">{file.name}</p>
            <p className="text-xs text-[#a8a29e]">{(file.size / 1024 / 1024).toFixed(1)} MB · Click to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f5f4]">
              <svg className="h-6 w-6 text-[#a8a29e]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-sm text-[#78716c]">
              {isDragActive ? 'Drop the PDF here' : 'Drag & drop inspection report PDF'}
            </p>
            <p className="text-xs text-[#a8a29e]">or click to browse · PDF only · Max 20 MB</p>
          </div>
        )}
      </div>

      {/* Progress state */}
      {progress !== 'idle' && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
          <svg className="h-4 w-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <p className="text-sm text-blue-700">
            {progress === 'uploading' ? 'Uploading PDF...' : 'Analyzing inspection report with Claude AI…'}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!file || uploading}
        className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {uploading ? 'Working…' : 'Analyze Report with Claude AI'}
      </button>
    </div>
  )
}
