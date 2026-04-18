'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { adminSaveAiConditionAction } from '@/app/actions/admin'
import { addDocumentAction } from '@/app/actions/listings'
import type { AiConditionData } from '@/lib/types/condition'
import { ratingBg, ratingLabel } from '@/lib/types/condition'

interface AdminConditionUploadProps {
  listingId: string
  alreadyLocked: boolean
}

function RatingBadge({ rating }: { rating: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ratingBg(rating as never)}`}>
      {ratingLabel(rating as never)}
    </span>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-[#f5f5f4] last:border-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e] mb-1">{label}</p>
      <div className="text-sm text-[#1c1917]">{value}</div>
    </div>
  )
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-[#a8a29e]">None noted</span>
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#a8a29e]" />
          {item}
        </li>
      ))}
    </ul>
  )
}

const sectionClass = 'rounded-xl border border-[#e7e5e4] bg-white p-6 mb-4'

export function AdminConditionUpload({ listingId, alreadyLocked }: AdminConditionUploadProps) {
  const router = useRouter()
  const [file, setFile]         = useState<File | null>(null)
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'analyzing' | 'saving'>('idle')
  const [error, setError]       = useState<string | null>(null)
  const [aiData, setAiData]     = useState<AiConditionData | null>(null)
  const [pdfKey, setPdfKey]     = useState<string>('')
  const [saving, setSaving]     = useState(false)
  const [docSaved, setDocSaved] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (f) { setFile(f); setError(null); setAiData(null) }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    maxSize: 20 * 1024 * 1024,
    onDrop,
    onDropRejected: () => setError('Only PDF files up to 20 MB are accepted'),
  })

  async function handleSaveDocument() {
    if (!file) return
    setError(null)
    setProgress('saving')
    try {
      const supabase   = createClient()
      const storageKey = `${listingId}/docs/${crypto.randomUUID()}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('car-documents')
        .upload(storageKey, file, { contentType: 'application/pdf', cacheControl: '3600', upsert: false })
      if (uploadError) throw new Error(uploadError.message)
      const result = await addDocumentAction(listingId, storageKey, 'inspection_report', file.name)
      if ('error' in result) throw new Error(result.error)
      setDocSaved(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save document')
    } finally {
      setProgress('idle')
    }
  }

  async function handleAnalyze() {
    if (!file) return
    setError(null)
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
      setAiData(data)
      setPdfKey(storageKey)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setProgress('idle')
    }
  }

  async function handleConfirm() {
    if (!aiData) return
    setSaving(true)
    setError(null)
    const result = await adminSaveAiConditionAction(listingId, aiData, pdfKey)
    if ('error' in result) {
      setError(result.error)
      setSaving(false)
      return
    }
    router.refresh()
  }

  if (alreadyLocked) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex items-center gap-3">
        <span className="text-green-600 text-xl">✓</span>
        <div>
          <p className="text-sm font-semibold text-green-800">Condition report locked</p>
          <p className="text-xs text-green-600 mt-0.5">AI-extracted condition data has been saved for this listing.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Upload */}
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
          isDragActive ? 'border-blue-500 bg-blue-50'
          : file ? 'border-green-400 bg-green-50'
          : 'border-[#e7e5e4] hover:border-[#a8a29e]'
        } ${progress !== 'idle' ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-[#1c1917]">{file.name}</p>
            <p className="text-xs text-[#a8a29e]">{(file.size / 1024 / 1024).toFixed(1)} MB · Click to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-[#78716c]">
              {isDragActive ? 'Drop the PDF here' : 'Drag & drop inspection report PDF'}
            </p>
            <p className="text-xs text-[#a8a29e]">or click to browse · PDF only · Max 20 MB</p>
          </div>
        )}
      </div>

      {progress !== 'idle' && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
          <svg className="h-4 w-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <p className="text-sm text-blue-700">
            {progress === 'uploading' ? 'Uploading PDF...' : 'Analyzing with Claude AI…'}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {!aiData && (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSaveDocument}
            disabled={!file || progress !== 'idle' || docSaved}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {progress === 'saving' ? 'Saving…' : docSaved ? 'Document Saved ✓' : 'Save Inspection Report'}
          </button>
          <button
            type="button"
            disabled
            title="AI analysis coming soon"
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white opacity-40 cursor-not-allowed"
          >
            Analyze Report with Claude AI (coming soon)
          </button>
        </div>
      )}

      {/* Review extracted data */}
      {aiData && (
        <div className="mt-6">
          <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
            <p className="text-xs font-semibold text-yellow-800">
              ⚠️ Review the extracted data below. Once confirmed, this cannot be changed.
            </p>
          </div>

          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1c1917]">Exterior</h3>
              <RatingBadge rating={aiData.exterior.rating} />
            </div>
            <p className="mb-4 text-xs italic text-[#78716c]">{aiData.exterior.rating_reason}</p>
            <Field label="Body Defects" value={<TagList items={aiData.exterior.body_defects} />} />
            <Field label="Scratches, Dings & Dents" value={aiData.exterior.scratches_dings_dents || <span className="text-[#a8a29e]">None noted</span>} />
            <Field label="Rust Areas" value={<TagList items={aiData.exterior.rust_areas} />} />
            <Field label="Glass Damage" value={<TagList items={aiData.exterior.glass_damage} />} />
          </div>

          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1c1917]">Interior</h3>
              <RatingBadge rating={aiData.interior.rating} />
            </div>
            <p className="mb-4 text-xs italic text-[#78716c]">{aiData.interior.rating_reason}</p>
            <Field label="Seat Wear" value={aiData.interior.seat_wear_degraded ? `Degraded — ${aiData.interior.seat_wear_severity ?? 'unknown severity'}` : 'No notable wear'} />
            <Field label="Missing or Broken" value={<TagList items={aiData.interior.missing_or_broken} />} />
          </div>

          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1c1917]">Mechanical</h3>
              <RatingBadge rating={aiData.mechanical.rating} />
            </div>
            <p className="mb-4 text-xs italic text-[#78716c]">{aiData.mechanical.rating_reason}</p>
            <Field label="Engine Abnormalities" value={aiData.mechanical.engine_abnormalities || <span className="text-[#a8a29e]">None noted</span>} />
            <Field label="Drive Notes" value={aiData.mechanical.drive_notes || <span className="text-[#a8a29e]">No notes</span>} />
          </div>

          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1c1917]">Tires & Wheels</h3>
              <RatingBadge rating={aiData.tires.rating} />
            </div>
            <p className="mb-4 text-xs italic text-[#78716c]">{aiData.tires.rating_reason}</p>
            <Field label="Wheel / Rim Damage" value={aiData.tires.wheel_rim_damage || <span className="text-[#a8a29e]">None noted</span>} />
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm & Lock Condition Report'}
          </button>
        </div>
      )}
    </div>
  )
}
