# Condition Assessment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Condition Assessment wizard step between Vehicle Details and Photos that collects structured condition data across 7 sections and persists it to the database.

**Architecture:** New `StepCondition` component follows the identical pattern of existing wizard steps (RHF + Zod + Supabase server action). A new DB migration adds 22 columns to `listings` plus extends the `listing_documents` type constraint. A shared `steps.ts` file eliminates the duplicated `Step` type between `ListingWizard` and `WizardProgress`.

**Tech Stack:** Next.js App Router, React Hook Form 7 + Zod 4, Base UI + Tailwind CSS, Supabase, react-dropzone (existing), Vitest

---

## Chunk 1: Data layer — migration, bug fix, schema, action

### Task 1: Write the DB migration

**Files:**
- Create: `supabase/migrations/009_condition_fields.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/009_condition_fields.sql

-- Add condition assessment columns to listings
ALTER TABLE public.listings
  ADD COLUMN overall_grade text CHECK (overall_grade IN ('excellent','good','fair','poor','salvage')),
  ADD COLUMN overall_notes text,
  ADD COLUMN paint_condition text CHECK (paint_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN body_condition  text CHECK (body_condition  IN ('excellent','good','fair','poor')),
  ADD COLUMN glass_condition text CHECK (glass_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN exterior_notes  text,
  ADD COLUMN seat_condition      text CHECK (seat_condition      IN ('excellent','good','fair','poor')),
  ADD COLUMN dashboard_condition text CHECK (dashboard_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN carpet_condition    text CHECK (carpet_condition    IN ('excellent','good','fair','poor')),
  ADD COLUMN interior_notes      text,
  ADD COLUMN engine_condition       text CHECK (engine_condition       IN ('excellent','good','fair','poor')),
  ADD COLUMN transmission_condition text CHECK (transmission_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN brake_condition        text CHECK (brake_condition        IN ('excellent','good','fair','poor')),
  ADD COLUMN tire_condition         text CHECK (tire_condition         IN ('excellent','good','fair','poor')),
  ADD COLUMN tire_tread_depth       int  CHECK (tire_tread_depth BETWEEN 0 AND 12),
  ADD COLUMN mechanical_notes       text,
  ADD COLUMN known_issues           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN has_accident_history   boolean NOT NULL DEFAULT false,
  ADD COLUMN has_flood_damage       boolean NOT NULL DEFAULT false,
  ADD COLUMN has_frame_damage       boolean NOT NULL DEFAULT false,
  ADD COLUMN has_rebuilt_title      boolean NOT NULL DEFAULT false,
  ADD COLUMN has_lien               boolean NOT NULL DEFAULT false,
  ADD COLUMN is_former_rental       boolean NOT NULL DEFAULT false;

-- Extend document_type constraint to allow inspection_report
ALTER TABLE public.listing_documents
  DROP CONSTRAINT listing_documents_document_type_check,
  ADD CONSTRAINT listing_documents_document_type_check
    CHECK (document_type IN ('carfax','title','service_history','other','inspection_report'));
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration runs without error. If using remote Supabase only (no local), run the SQL directly in the Supabase dashboard SQL editor instead.

- [ ] **Step 3: Verify columns exist**

```bash
npx supabase db diff
```

Expected: no diff (migration is fully applied). Alternatively, query `information_schema.columns WHERE table_name = 'listings'` in the Supabase dashboard and confirm `overall_grade`, `known_issues`, etc. appear.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/009_condition_fields.sql
git commit -m "feat: add condition assessment columns to listings + extend document_type constraint"
```

---

### Task 2: Fix the `original_name` / `file_name` bug (5 locations)

**Files:**
- Modify: `app/actions/listings.ts:137-156`
- Modify: `components/listings/DocumentUpload.tsx:10-29`
- Modify: `components/listings/wizard/StepDocuments.tsx:8`
- Modify: `components/listings/wizard/ListingWizard.tsx:58`
- Modify: `app/(seller)/seller/listings/[id]/edit/page.tsx:12`

The `listing_documents` table has a `file_name` column, but every reference in the app uses `original_name` (a column that does not exist). This silently persists `null` for all document names.

- [ ] **Step 1: Fix `addDocumentAction` in `app/actions/listings.ts`**

Change the function signature and insert to use `fileName`:

```typescript
export async function addDocumentAction(
  listingId: string,
  storageKey: string,
  documentType: string,
  fileName: string          // was: originalName
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('listing_documents').insert({
    listing_id:    listingId,
    storage_key:   storageKey,
    document_type: documentType,
    file_name:     fileName,   // was: original_name: originalName
  })

  if (error) return { error: error.message }
  return { success: true }
}
```

- [ ] **Step 2: Fix `DocumentUpload.tsx` — prop type, internal mapping, action call**

In `components/listings/DocumentUpload.tsx`, update:

```typescript
// Line 10-15: rename internal field
interface DocumentItem {
  id:           string
  storageKey:   string
  documentType: string
  fileName:     string   // was: originalName
}

// Line 17-20: fix initialDocs prop type
interface DocumentUploadProps {
  listingId:          string
  initialDocs:        { id: string; storage_key: string; document_type: string; file_name: string }[]
  // was: original_name: string
}

// Line 23-29: fix the state initializer
const [docs, setDocs] = useState<DocumentItem[]>(
  initialDocs.map(d => ({
    id:           d.id,
    storageKey:   d.storage_key,
    documentType: d.document_type,
    fileName:     d.file_name,   // was: originalName: d.original_name
  }))
)
```

Also update the `addDocumentAction` call (line 55) — the parameter name changed but the value (`file.name`) stays the same. The call site already passes `file.name` so just confirm the signature lines up.

Update the state update after upload (line 58-63):
```typescript
setDocs(prev => [...prev, {
  id:           crypto.randomUUID(),
  storageKey,
  documentType: docType,
  fileName:     file.name,   // was: originalName: file.name
}])
```

Update the display in the list (line 109):
```typescript
<span className="flex-1 text-sm text-[#1c1917]">{doc.fileName}</span>
// was: {doc.originalName}
```

- [ ] **Step 3: Fix `StepDocuments.tsx` — prop type**

In `components/listings/wizard/StepDocuments.tsx`, update the `initialDocs` prop type:

```typescript
interface StepDocumentsProps {
  listingId:   string
  initialDocs: { id: string; storage_key: string; document_type: string; file_name: string }[]
  // was: original_name: string
  onSave:      () => void
}
```

- [ ] **Step 4: Fix `ListingWizard.tsx` — inline type cast**

In `components/listings/wizard/ListingWizard.tsx` line 58, change the inline cast:

```typescript
initialDocs={(initialData?.listing_documents as { id: string; storage_key: string; document_type: string; file_name: string }[]) ?? []}
// was: original_name: string
```

- [ ] **Step 5: Fix the edit page Supabase query**

In `app/(seller)/seller/listings/[id]/edit/page.tsx` line 12, update the select string:

```typescript
.select('*, listing_photos(id, storage_key, position), listing_documents(id, storage_key, document_type, file_name)')
// was: original_name
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add app/actions/listings.ts components/listings/DocumentUpload.tsx \
        components/listings/wizard/StepDocuments.tsx \
        components/listings/wizard/ListingWizard.tsx \
        app/\(seller\)/seller/listings/\[id\]/edit/page.tsx
git commit -m "fix: rename original_name to file_name across all document upload paths"
```

---

### Task 3: Add `conditionStepSchema` to validations

**Files:**
- Modify: `lib/validations/listing.ts`
- Create: `tests/listings/condition-schema.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/listings/condition-schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { conditionStepSchema } from '@/lib/validations/listing'

describe('conditionStepSchema (COND-01)', () => {
  it('rejects when overall_grade is missing', () => {
    const result = conditionStepSchema.safeParse({
      paint_condition: 'good',
      body_condition:  'good',
      seat_condition:  'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0])
      expect(paths).toContain('overall_grade')
    }
  })

  it('rejects when paint_condition is missing', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      body_condition:  'good',
      seat_condition:  'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when body_condition is missing', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      paint_condition: 'good',
      seat_condition:  'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when seat_condition is missing', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      paint_condition: 'good',
      body_condition:  'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when engine_condition is missing', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      paint_condition: 'good',
      body_condition:  'good',
      seat_condition:  'good',
    })
    expect(result.success).toBe(false)
  })

  it('rejects tire_tread_depth above 12', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      paint_condition: 'good',
      body_condition:  'good',
      seat_condition:  'good',
      engine_condition: 'good',
      tire_tread_depth: 13,
    })
    expect(result.success).toBe(false)
  })

  it('rejects tire_tread_depth below 0', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'good',
      paint_condition:  'good',
      body_condition:   'good',
      seat_condition:   'good',
      engine_condition: 'good',
      tire_tread_depth: -1,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a fully valid minimal payload', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'excellent',
      paint_condition:  'good',
      body_condition:   'fair',
      seat_condition:   'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(true)
  })

  it('defaults known_issues to empty array', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'good',
      paint_condition:  'good',
      body_condition:   'good',
      seat_condition:   'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.known_issues).toEqual([])
  })

  it('defaults all boolean disclosures to false', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'good',
      paint_condition:  'good',
      body_condition:   'good',
      seat_condition:   'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.has_accident_history).toBe(false)
      expect(result.data.has_flood_damage).toBe(false)
      expect(result.data.has_frame_damage).toBe(false)
      expect(result.data.has_rebuilt_title).toBe(false)
      expect(result.data.has_lien).toBe(false)
      expect(result.data.is_former_rental).toBe(false)
    }
  })

  it('rejects an invalid overall_grade value', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'perfect',  // not in enum
      paint_condition:  'good',
      body_condition:   'good',
      seat_condition:   'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
  })

  it('accepts salvage as overall_grade', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'salvage',
      paint_condition:  'poor',
      body_condition:   'poor',
      seat_condition:   'poor',
      engine_condition: 'poor',
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/listings/condition-schema.test.ts
```

Expected: all tests FAIL with "conditionStepSchema is not exported" or similar.

- [ ] **Step 3: Add the schema to `lib/validations/listing.ts`**

Append to the existing file:

```typescript
export const conditionStepSchema = z.object({
  // Overall (required)
  overall_grade: z.enum(['excellent','good','fair','poor','salvage'], {
    error: 'Overall grade is required',
  }),
  overall_notes: z.string().optional(),

  // Exterior (paint + body required)
  paint_condition: z.enum(['excellent','good','fair','poor'], {
    error: 'Paint condition is required',
  }),
  body_condition: z.enum(['excellent','good','fair','poor'], {
    error: 'Body condition is required',
  }),
  glass_condition: z.enum(['excellent','good','fair','poor']).optional(),
  exterior_notes:  z.string().optional(),

  // Interior (seats required)
  seat_condition: z.enum(['excellent','good','fair','poor'], {
    error: 'Seat condition is required',
  }),
  dashboard_condition: z.enum(['excellent','good','fair','poor']).optional(),
  carpet_condition:    z.enum(['excellent','good','fair','poor']).optional(),
  interior_notes:      z.string().optional(),

  // Mechanical (engine required)
  engine_condition: z.enum(['excellent','good','fair','poor'], {
    error: 'Engine condition is required',
  }),
  transmission_condition: z.enum(['excellent','good','fair','poor']).optional(),
  brake_condition:        z.enum(['excellent','good','fair','poor']).optional(),
  tire_condition:         z.enum(['excellent','good','fair','poor']).optional(),
  tire_tread_depth:       z.number().int().min(0).max(12).optional(),
  mechanical_notes:       z.string().optional(),

  // Known Issues
  known_issues: z.array(z.string()).default([]),

  // Disclosures
  has_accident_history: z.boolean().default(false),
  has_flood_damage:     z.boolean().default(false),
  has_frame_damage:     z.boolean().default(false),
  has_rebuilt_title:    z.boolean().default(false),
  has_lien:             z.boolean().default(false),
  is_former_rental:     z.boolean().default(false),
})

export type ConditionStepInput = z.infer<typeof conditionStepSchema>
```

> Note on Zod v4: use `error:` not `required_error:` for the enum error option. Zod v4 merged all error options under `error`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- tests/listings/condition-schema.test.ts
```

Expected: all 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/listing.ts tests/listings/condition-schema.test.ts
git commit -m "feat: add conditionStepSchema with validation tests"
```

---

### Task 4: Add `updateConditionAction`

**Files:**
- Modify: `app/actions/listings.ts`

- [ ] **Step 1: Add the import at the top of `app/actions/listings.ts`**

Add to the existing imports:

```typescript
import type { ConditionStepInput } from '@/lib/validations/listing'
```

(The file already imports `DetailsStepInput` from the same path — add `ConditionStepInput` to that import.)

- [ ] **Step 2: Append `updateConditionAction` to `app/actions/listings.ts`**

```typescript
export async function updateConditionAction(
  listingId: string,
  data: ConditionStepInput
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('listings')
    .update({
      overall_grade:          data.overall_grade,
      overall_notes:          data.overall_notes ?? null,
      paint_condition:        data.paint_condition,
      body_condition:         data.body_condition,
      glass_condition:        data.glass_condition ?? null,
      exterior_notes:         data.exterior_notes ?? null,
      seat_condition:         data.seat_condition,
      dashboard_condition:    data.dashboard_condition ?? null,
      carpet_condition:       data.carpet_condition ?? null,
      interior_notes:         data.interior_notes ?? null,
      engine_condition:       data.engine_condition,
      transmission_condition: data.transmission_condition ?? null,
      brake_condition:        data.brake_condition ?? null,
      tire_condition:         data.tire_condition ?? null,
      tire_tread_depth:       data.tire_tread_depth ?? null,
      mechanical_notes:       data.mechanical_notes ?? null,
      known_issues:           data.known_issues,
      has_accident_history:   data.has_accident_history,
      has_flood_damage:       data.has_flood_damage,
      has_frame_damage:       data.has_frame_damage,
      has_rebuilt_title:      data.has_rebuilt_title,
      has_lien:               data.has_lien,
      is_former_rental:       data.is_former_rental,
      updated_at:             new Date().toISOString(),
    })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/actions/listings.ts
git commit -m "feat: add updateConditionAction server action"
```

---

## Chunk 2: DocumentUpload refactor — theme + lockedDocumentType prop

### Task 5: Refactor `DocumentUpload` (re-theme + `lockedDocumentType` prop)

**Files:**
- Modify: `components/listings/DocumentUpload.tsx`

This task re-themes the component from dark zinc to the warm light palette AND adds the `lockedDocumentType` prop used by the inspection report section in `StepCondition`. The `file_name` fixes from Task 2 are already done.

- [ ] **Step 1: Rewrite `DocumentUpload.tsx` with warm light theme and `lockedDocumentType` prop**

Replace the full component:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/listings/DocumentUpload.tsx
git commit -m "refactor: re-theme DocumentUpload to warm light palette and add lockedDocumentType prop"
```

---

## Chunk 3: StepCondition component + wizard integration

### Task 6: Extract shared `steps.ts`

**Files:**
- Create: `components/listings/wizard/steps.ts`
- Modify: `components/listings/wizard/ListingWizard.tsx`
- Modify: `components/listings/wizard/WizardProgress.tsx`

- [ ] **Step 1: Create `components/listings/wizard/steps.ts`**

```typescript
export type Step = 'vin' | 'details' | 'condition' | 'photos' | 'documents' | 'review'

export const STEPS: Step[] = ['vin', 'details', 'condition', 'photos', 'documents', 'review']

export const STEP_LABELS: Record<Step, string> = {
  vin:       'VIN Lookup',
  details:   'Vehicle Details',
  condition: 'Condition',
  photos:    'Photos',
  documents: 'Documents',
  review:    'Review & Publish',
}
```

- [ ] **Step 2: Update `WizardProgress.tsx` to import from `steps.ts`**

Replace the full file:

```typescript
import { STEPS, STEP_LABELS, type Step } from './steps'

export function WizardProgress({ current }: { current: Step }) {
  const currentIdx = STEPS.indexOf(current)
  return (
    <div className="mb-8 flex items-center justify-between">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            i < currentIdx ? 'bg-blue-600 text-white' :
            i === currentIdx ? 'border-2 border-blue-600 bg-white text-blue-600' :
            'border border-[#e7e5e4] bg-white text-[#a8a29e]'
          }`}>
            {i < currentIdx ? '✓' : i + 1}
          </div>
          <span className={`ml-2 hidden text-xs sm:block ${i === currentIdx ? 'text-[#1c1917]' : 'text-[#a8a29e]'}`}>
            {STEP_LABELS[step]}
          </span>
          {i < STEPS.length - 1 && <div className="mx-3 h-px w-8 bg-[#e7e5e4] sm:w-16" />}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors. (`ListingWizard` still has its own local `Step` type — that's fine for now, it gets replaced in Task 8.)

- [ ] **Step 4: Commit**

```bash
git add components/listings/wizard/steps.ts components/listings/wizard/WizardProgress.tsx
git commit -m "refactor: extract shared Step type and STEPS array to steps.ts"
```

---

### Task 7: Create `StepCondition.tsx`

**Files:**
- Create: `components/listings/wizard/StepCondition.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { conditionStepSchema, type ConditionStepInput } from '@/lib/validations/listing'
import { updateConditionAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { DocumentUpload } from '@/components/listings/DocumentUpload'

interface StepConditionProps {
  listingId:              string
  initialData?:           Partial<ConditionStepInput>
  initialInspectionDocs?: { id: string; storage_key: string; document_type: string; file_name: string }[]
  onSave:                 () => void
}

const GRADE_OPTIONS = [
  { value: 'excellent', label: 'Excellent', hint: 'Like new. No visible flaws, fully functional.' },
  { value: 'good',      label: 'Good',      hint: 'Minor wear consistent with age. No major defects.' },
  { value: 'fair',      label: 'Fair',      hint: 'Visible wear or minor issues. Functional but imperfect.' },
  { value: 'poor',      label: 'Poor',      hint: 'Significant wear or defects. May need repair.' },
  { value: 'salvage',   label: 'Salvage',   hint: 'Major damage or non-operational.' },
] as const

const CONDITION_OPTIONS = [
  { value: '',          label: 'Not assessed' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
  { value: 'poor',      label: 'Poor' },
] as const

const REQUIRED_CONDITION_OPTIONS = [
  { value: '',          label: 'Select...' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
  { value: 'poor',      label: 'Poor' },
] as const

const COMMON_ISSUES = [
  'Check engine light',
  'AC not working',
  'Power window issue',
  'Minor rust',
  'Oil leak',
  'Brake noise',
  'Transmission slip',
  'Coolant leak',
]

const selectClass = 'w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] focus:border-blue-600 focus:outline-none appearance-none'
const textareaClass = 'min-h-[72px] w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-600 focus:outline-none resize-y'
const sectionClass = 'rounded-xl border border-[#e7e5e4] bg-white p-6 mb-6'

export function StepCondition({ listingId, initialData, initialInspectionDocs = [], onSave }: StepConditionProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [issueInput, setIssueInput] = useState('')

  const form = useForm<ConditionStepInput>({
    resolver: zodResolver(conditionStepSchema),
    defaultValues: {
      overall_grade:          (initialData?.overall_grade as ConditionStepInput['overall_grade']) ?? undefined,
      overall_notes:          initialData?.overall_notes          ?? '',
      paint_condition:        (initialData?.paint_condition as ConditionStepInput['paint_condition']) ?? undefined,
      body_condition:         (initialData?.body_condition as ConditionStepInput['body_condition']) ?? undefined,
      glass_condition:        (initialData?.glass_condition as ConditionStepInput['glass_condition']) ?? undefined,
      exterior_notes:         initialData?.exterior_notes         ?? '',
      seat_condition:         (initialData?.seat_condition as ConditionStepInput['seat_condition']) ?? undefined,
      dashboard_condition:    (initialData?.dashboard_condition as ConditionStepInput['dashboard_condition']) ?? undefined,
      carpet_condition:       (initialData?.carpet_condition as ConditionStepInput['carpet_condition']) ?? undefined,
      interior_notes:         initialData?.interior_notes         ?? '',
      engine_condition:       (initialData?.engine_condition as ConditionStepInput['engine_condition']) ?? undefined,
      transmission_condition: (initialData?.transmission_condition as ConditionStepInput['transmission_condition']) ?? undefined,
      brake_condition:        (initialData?.brake_condition as ConditionStepInput['brake_condition']) ?? undefined,
      tire_condition:         (initialData?.tire_condition as ConditionStepInput['tire_condition']) ?? undefined,
      tire_tread_depth:       initialData?.tire_tread_depth       ?? undefined,
      mechanical_notes:       initialData?.mechanical_notes       ?? '',
      known_issues:           initialData?.known_issues           ?? [],
      has_accident_history:   initialData?.has_accident_history   ?? false,
      has_flood_damage:       initialData?.has_flood_damage        ?? false,
      has_frame_damage:       initialData?.has_frame_damage        ?? false,
      has_rebuilt_title:      initialData?.has_rebuilt_title       ?? false,
      has_lien:               initialData?.has_lien                ?? false,
      is_former_rental:       initialData?.is_former_rental        ?? false,
    },
  })

  const { setValue, watch } = form
  const currentGrade  = watch('overall_grade')
  const currentIssues = watch('known_issues')

  function addIssue(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    if (currentIssues.includes(trimmed)) return
    setValue('known_issues', [...currentIssues, trimmed], { shouldValidate: true })
    setIssueInput('')
  }

  function removeIssue(issue: string) {
    setValue('known_issues', currentIssues.filter(i => i !== issue), { shouldValidate: true })
  }

  async function onSubmit(data: ConditionStepInput) {
    setServerError(null)
    const result = await updateConditionAction(listingId, data)
    if ('error' in result) {
      setServerError(result.error)
      return
    }
    onSave()
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Condition Assessment</h2>
      <p className="mb-6 text-sm text-[#78716c]">Describe the vehicle's current condition. Accurate details build buyer trust.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>

          {/* ── Section 1: Overall Grade ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Overall Grade</h3>
            <p className="mb-4 text-sm text-[#78716c]">Give the vehicle an overall condition rating.</p>

            <FormField
              control={form.control}
              name="overall_grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Overall Grade *</FormLabel>
                  <FormControl>
                    <div className="mt-1 flex gap-2">
                      {GRADE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={`flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                            field.value === opt.value
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'border-[#e7e5e4] bg-white text-[#78716c] hover:border-[#a8a29e]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  {currentGrade && (
                    <p className="mt-1.5 text-xs text-[#a8a29e]">
                      {GRADE_OPTIONS.find(o => o.value === currentGrade)?.hint}
                    </p>
                  )}
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <div className="mt-4">
              <FormField
                control={form.control}
                name="overall_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#78716c]">Summary Notes</FormLabel>
                    <FormControl>
                      <textarea
                        className={textareaClass}
                        placeholder="Brief overview of the vehicle's condition..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Section 2: Exterior ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Exterior</h3>
            <p className="mb-4 text-sm text-[#78716c]">Assess paint, body panels, and glass.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="paint_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Paint Condition *</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {REQUIRED_CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="body_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Body Panels *</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {REQUIRED_CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="glass_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Glass & Windows</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="mt-4">
              <FormField control={form.control} name="exterior_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Exterior Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className={textareaClass}
                      placeholder="e.g. Small scratch on rear bumper, paint fade on hood..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>
          </div>

          {/* ── Section 3: Interior ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Interior</h3>
            <p className="mb-4 text-sm text-[#78716c]">Seats, dashboard, carpet, and trim.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="seat_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Seats & Upholstery *</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {REQUIRED_CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="dashboard_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Dashboard & Trim</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="carpet_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Carpet & Headliner</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="mt-4">
              <FormField control={form.control} name="interior_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Interior Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className={textareaClass}
                      placeholder="e.g. Minor wear on driver seat, all electronics functional..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>
          </div>

          {/* ── Section 4: Mechanical ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Mechanical</h3>
            <p className="mb-4 text-sm text-[#78716c]">Engine, drivetrain, brakes, and tires.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="engine_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Engine *</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {REQUIRED_CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="transmission_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Transmission</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="brake_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Brakes</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="tire_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Tires</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="tire_tread_depth" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Tread Depth (mm)</FormLabel>
                  <FormControl>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      step={1}
                      className="w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-600 focus:outline-none"
                      placeholder="e.g. 7"
                      value={field.value ?? ''}
                      onChange={e => {
                        const val = e.target.value
                        field.onChange(val === '' ? undefined : parseInt(val, 10))
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="mt-4">
              <FormField control={form.control} name="mechanical_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Mechanical Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className={textareaClass}
                      placeholder="e.g. Recent brake job, new tires installed 6 months ago..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>
          </div>

          {/* ── Section 5: Known Issues ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Known Issues</h3>
            <p className="mb-4 text-sm text-[#78716c]">Tag any known problems. Buyers appreciate honesty.</p>

            {currentIssues.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {currentIssues.map(issue => (
                  <span
                    key={issue}
                    className="flex items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-[#fafaf9] px-3 py-1 text-sm text-[#1c1917]"
                  >
                    {issue}
                    <button
                      type="button"
                      onClick={() => removeIssue(issue)}
                      className="text-[#a8a29e] hover:text-[#1c1917]"
                      aria-label={`Remove ${issue}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={issueInput}
                onChange={e => setIssueInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIssue(issueInput) } }}
                placeholder="Type an issue and press + to add..."
                className="flex-1 rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addIssue(issueInput)}
                className="rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]"
              >
                + Add
              </button>
            </div>

            <p className="mt-2 text-xs text-[#a8a29e]">
              Common:{' '}
              {COMMON_ISSUES.map((issue, i) => (
                <span key={issue}>
                  <button
                    type="button"
                    onClick={() => addIssue(issue)}
                    className="underline hover:text-[#78716c]"
                  >
                    {issue}
                  </button>
                  {i < COMMON_ISSUES.length - 1 && ' · '}
                </span>
              ))}
            </p>
          </div>

          {/* ── Section 6: Seller Disclosures ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Seller Disclosures</h3>
            <p className="mb-4 text-sm text-[#78716c]">Check all that apply. Honest disclosures build buyer trust.</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                { name: 'has_accident_history', label: 'Prior accident history' },
                { name: 'has_flood_damage',     label: 'Flood or water damage' },
                { name: 'has_frame_damage',     label: 'Frame or structural damage' },
                { name: 'has_rebuilt_title',    label: 'Rebuilt or salvage title' },
                { name: 'has_lien',             label: 'Active lien on vehicle' },
                { name: 'is_former_rental',     label: 'Former rental or fleet vehicle' },
              ] as const).map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2.5">
                      <FormControl>
                        <input
                          type="checkbox"
                          id={name}
                          checked={field.value}
                          onChange={e => field.onChange(e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-blue-600"
                        />
                      </FormControl>
                      <FormLabel htmlFor={name} className="cursor-pointer text-sm font-normal text-[#1c1917]">
                        {label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          {/* ── Section 7: Inspection Report ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Inspection Report</h3>
            <p className="mb-1 text-sm text-[#78716c]">Upload a third-party inspection report (PDF). Optional but increases buyer confidence.</p>
            <p className="mb-4 text-xs text-[#a8a29e]">You can continue without uploading a report.</p>

            <DocumentUpload
              listingId={listingId}
              initialDocs={initialInspectionDocs}
              lockedDocumentType="inspection_report"
            />
          </div>

          {serverError && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/listings/wizard/StepCondition.tsx
git commit -m "feat: add StepCondition component"
```

---

### Task 8: Wire `StepCondition` into `ListingWizard` + update edit page

**Files:**
- Modify: `components/listings/wizard/ListingWizard.tsx`
- Modify: `app/(seller)/seller/listings/[id]/edit/page.tsx`

- [ ] **Step 1: Rewrite `ListingWizard.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { STEPS, type Step } from './steps'
import { WizardProgress } from './WizardProgress'
import { StepVinLookup } from './StepVinLookup'
import { StepVehicleDetails } from './StepVehicleDetails'
import { StepCondition } from './StepCondition'
import { StepPhotos } from './StepPhotos'
import { StepDocuments } from './StepDocuments'
import { StepReview } from './StepReview'
import type { ConditionStepInput } from '@/lib/validations/listing'

interface ListingWizardProps {
  listingId?:   string
  initialData?: Record<string, unknown>
}

export function ListingWizard({ listingId, initialData }: ListingWizardProps) {
  const [step, setStep]     = useState<Step>(listingId ? 'details' : 'vin')
  const [draftId, setDraftId] = useState<string | null>(listingId ?? null)
  const [vinData, setVinData] = useState<Record<string, unknown> | null>(null)

  function advance() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  // Extract condition fields from initialData for StepCondition
  const conditionInitialData: Partial<ConditionStepInput> | undefined = initialData
    ? {
        overall_grade:          initialData.overall_grade          as ConditionStepInput['overall_grade'],
        overall_notes:          initialData.overall_notes          as string | undefined,
        paint_condition:        initialData.paint_condition        as ConditionStepInput['paint_condition'],
        body_condition:         initialData.body_condition         as ConditionStepInput['body_condition'],
        glass_condition:        initialData.glass_condition        as ConditionStepInput['glass_condition'],
        exterior_notes:         initialData.exterior_notes         as string | undefined,
        seat_condition:         initialData.seat_condition         as ConditionStepInput['seat_condition'],
        dashboard_condition:    initialData.dashboard_condition    as ConditionStepInput['dashboard_condition'],
        carpet_condition:       initialData.carpet_condition       as ConditionStepInput['carpet_condition'],
        interior_notes:         initialData.interior_notes         as string | undefined,
        engine_condition:       initialData.engine_condition       as ConditionStepInput['engine_condition'],
        transmission_condition: initialData.transmission_condition as ConditionStepInput['transmission_condition'],
        brake_condition:        initialData.brake_condition        as ConditionStepInput['brake_condition'],
        tire_condition:         initialData.tire_condition         as ConditionStepInput['tire_condition'],
        tire_tread_depth:       initialData.tire_tread_depth       as number | undefined,
        mechanical_notes:       initialData.mechanical_notes       as string | undefined,
        known_issues:           (initialData.known_issues          as string[]) ?? [],
        has_accident_history:   (initialData.has_accident_history  as boolean) ?? false,
        has_flood_damage:       (initialData.has_flood_damage      as boolean) ?? false,
        has_frame_damage:       (initialData.has_frame_damage      as boolean) ?? false,
        has_rebuilt_title:      (initialData.has_rebuilt_title     as boolean) ?? false,
        has_lien:               (initialData.has_lien              as boolean) ?? false,
        is_former_rental:       (initialData.is_former_rental      as boolean) ?? false,
      }
    : undefined

  return (
    <div className="mx-auto max-w-2xl">
      <WizardProgress current={step} />

      {step === 'vin' && (
        <StepVinLookup
          onSuccess={(id, vehicle) => {
            setDraftId(id)
            if (vehicle) setVinData({ make: vehicle.make, model: vehicle.model, year: vehicle.year })
            advance()
          }}
        />
      )}

      {step === 'details' && draftId && (
        <StepVehicleDetails
          listingId={draftId}
          initialData={vinData ?? initialData}
          onSave={advance}
        />
      )}

      {step === 'condition' && draftId && (
        <StepCondition
          listingId={draftId}
          initialData={conditionInitialData}
          initialInspectionDocs={
            (initialData?.listing_documents as { id: string; storage_key: string; document_type: string; file_name: string }[] | undefined)
              ?.filter(d => d.document_type === 'inspection_report') ?? []
          }
          onSave={advance}
        />
      )}

      {step === 'photos' && draftId && (
        <StepPhotos
          listingId={draftId}
          initialPhotos={(initialData?.listing_photos as { id: string; storage_key: string; position: number }[]) ?? []}
          onSave={advance}
        />
      )}

      {step === 'documents' && draftId && (
        <StepDocuments
          listingId={draftId}
          initialDocs={
            (initialData?.listing_documents as { id: string; storage_key: string; document_type: string; file_name: string }[] | undefined)
              ?.filter(d => d.document_type !== 'inspection_report') ?? []
          }
          onSave={advance}
        />
      )}

      {step === 'review' && draftId && (
        <StepReview listingId={draftId} />
      )}
    </div>
  )
}
```

> Note: `StepDocuments` now receives only non-inspection-report documents (inspection reports are handled in `StepCondition`).

- [ ] **Step 2: Update the edit page query to select new condition columns + fix `file_name`**

Replace `app/(seller)/seller/listings/[id]/edit/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ListingWizard } from '@/components/listings/wizard/ListingWizard'

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      *,
      listing_photos(id, storage_key, position),
      listing_documents(id, storage_key, document_type, file_name)
    `)
    .eq('id', id)
    .eq('seller_id', user!.id)
    .single()

  if (!listing) notFound()

  return <ListingWizard initialData={listing} listingId={id} />
}
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Run the full test suite to make sure nothing is broken**

```bash
npm run test:unit
```

Expected: all tests pass including the new `condition-schema.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add components/listings/wizard/ListingWizard.tsx \
        app/\(seller\)/seller/listings/\[id\]/edit/page.tsx
git commit -m "feat: wire StepCondition into wizard and update edit page query"
```

---

### Task 9: Smoke test the full flow

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to a new listing**

Go to `/seller/listings/new`. Verify the WizardProgress bar shows 6 steps: VIN Lookup, Vehicle Details, Condition, Photos, Documents, Review & Publish.

- [ ] **Step 3: Complete VIN + Details steps, then land on Condition**

Fill in VIN, advance to Details, fill in Details, advance. Verify the Condition Assessment form loads with all 7 sections visible.

- [ ] **Step 4: Test required field validation**

Click "Save & Continue" without filling anything. Verify inline errors appear on Overall Grade, Paint Condition, Body Panels, Seats & Upholstery, and Engine.

- [ ] **Step 5: Fill the form and save**

Select a grade, fill required selects, add a known issue tag via the input, check a disclosure checkbox, click Save & Continue. Verify the wizard advances to Photos.

- [ ] **Step 6: Test the edit flow**

Navigate to `/seller/listings/[id]/edit` for the listing just created. Verify the Condition step pre-populates with the saved values.

- [ ] **Step 7: Final commit**

```bash
git add components/listings/wizard/StepCondition.tsx \
        components/listings/wizard/ListingWizard.tsx \
        components/listings/wizard/WizardProgress.tsx \
        components/listings/wizard/steps.ts \
        components/listings/DocumentUpload.tsx \
        components/listings/wizard/StepDocuments.tsx \
        lib/validations/listing.ts \
        app/actions/listings.ts \
        app/\(seller\)/seller/listings/\[id\]/edit/page.tsx \
        supabase/migrations/009_condition_fields.sql \
        tests/listings/condition-schema.test.ts
git commit -m "feat: condition assessment step complete"
```
