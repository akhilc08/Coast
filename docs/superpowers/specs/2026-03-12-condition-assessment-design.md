# Condition Assessment Step — Design Spec

**Date:** 2026-03-12
**Status:** Approved

---

## Overview

Add a dedicated **Condition Assessment** wizard step to the car listing flow. It replaces the single `condition_notes` textarea currently in the Vehicle Details step with a structured, multi-section form covering overall grade, exterior, interior, mechanical, known issues, seller disclosures, and an optional inspection report PDF.

---

## Wizard Integration

**New step order:** `vin → details → condition → photos → documents → review`

- Add `'condition'` to the `Step` union type in `ListingWizard.tsx`
- Insert `<StepCondition>` into the wizard's render switch between Details and Photos
- Update `WizardProgress.tsx` to include a "Condition" label
- Both `ListingWizard.tsx` and `WizardProgress.tsx` currently duplicate the `Step` type and `STEPS` array. Extract both to a new shared file `components/listings/wizard/steps.ts` and import from there to prevent future drift.
- No changes to any other existing steps

---

## Data Model

### Migration: `supabase/migrations/009_condition_fields.sql`

> Note: migrations 003–008 already exist. This is the next available slot.

Add the following columns to the `listings` table:

```sql
-- Overall
ALTER TABLE public.listings
  ADD COLUMN overall_grade text CHECK (overall_grade IN ('excellent','good','fair','poor','salvage')),
  ADD COLUMN overall_notes text,

-- Exterior
  ADD COLUMN paint_condition text CHECK (paint_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN body_condition  text CHECK (body_condition  IN ('excellent','good','fair','poor')),
  ADD COLUMN glass_condition text CHECK (glass_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN exterior_notes  text,

-- Interior
  ADD COLUMN seat_condition      text CHECK (seat_condition      IN ('excellent','good','fair','poor')),
  ADD COLUMN dashboard_condition text CHECK (dashboard_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN carpet_condition    text CHECK (carpet_condition    IN ('excellent','good','fair','poor')),
  ADD COLUMN interior_notes      text,

-- Mechanical
  ADD COLUMN engine_condition       text CHECK (engine_condition       IN ('excellent','good','fair','poor')),
  ADD COLUMN transmission_condition text CHECK (transmission_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN brake_condition        text CHECK (brake_condition        IN ('excellent','good','fair','poor')),
  ADD COLUMN tire_condition         text CHECK (tire_condition         IN ('excellent','good','fair','poor')),
  ADD COLUMN tire_tread_depth       int  CHECK (tire_tread_depth BETWEEN 0 AND 12),
  ADD COLUMN mechanical_notes       text,

-- Known Issues (PostgreSQL array)
  ADD COLUMN known_issues text[] NOT NULL DEFAULT '{}',

-- Seller Disclosures
  ADD COLUMN has_accident_history boolean NOT NULL DEFAULT false,
  ADD COLUMN has_flood_damage     boolean NOT NULL DEFAULT false,
  ADD COLUMN has_frame_damage     boolean NOT NULL DEFAULT false,
  ADD COLUMN has_rebuilt_title    boolean NOT NULL DEFAULT false,
  ADD COLUMN has_lien             boolean NOT NULL DEFAULT false,
  ADD COLUMN is_former_rental     boolean NOT NULL DEFAULT false;

-- Extend document_type check constraint to support inspection reports
ALTER TABLE public.listing_documents
  DROP CONSTRAINT listing_documents_document_type_check,
  ADD CONSTRAINT listing_documents_document_type_check
    CHECK (document_type IN ('carfax','title','service_history','other','inspection_report'));
```

`tire_tread_depth` is stored in **millimetres** (range 0–12 mm; new tires ≈ 8–9 mm, legal minimum ≈ 1.6 mm). The UI label must read "Tread Depth (mm)".

---

## Validation Schema

**File:** `lib/validations/listing.ts`

Add `conditionStepSchema`:

```typescript
export const conditionStepSchema = z.object({
  // Overall (required)
  overall_grade: z.enum(['excellent','good','fair','poor','salvage'], {
    required_error: 'Overall grade is required',
  }),
  overall_notes: z.string().optional(),

  // Exterior (paint + body required)
  paint_condition: z.enum(['excellent','good','fair','poor'], {
    required_error: 'Paint condition is required',
  }),
  body_condition: z.enum(['excellent','good','fair','poor'], {
    required_error: 'Body condition is required',
  }),
  glass_condition: z.enum(['excellent','good','fair','poor']).optional(),
  exterior_notes:  z.string().optional(),

  // Interior (seats required)
  seat_condition:      z.enum(['excellent','good','fair','poor'], {
    required_error: 'Seat condition is required',
  }),
  dashboard_condition: z.enum(['excellent','good','fair','poor']).optional(),
  carpet_condition:    z.enum(['excellent','good','fair','poor']).optional(),
  interior_notes:      z.string().optional(),

  // Mechanical (engine required)
  engine_condition:       z.enum(['excellent','good','fair','poor'], {
    required_error: 'Engine condition is required',
  }),
  transmission_condition: z.enum(['excellent','good','fair','poor']).optional(),
  brake_condition:        z.enum(['excellent','good','fair','poor']).optional(),
  tire_condition:         z.enum(['excellent','good','fair','poor']).optional(),
  tire_tread_depth:       z.number().int().min(0).max(12).optional(), // millimetres
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

---

## Server Action

**File:** `app/actions/listings.ts`

```typescript
export async function updateConditionAction(
  listingId: string,
  data: ConditionStepInput
): Promise<{ success: true } | { error: string }>
```

- Authenticates the caller via Supabase session (same pattern as `updateListingAction`)
- Runs `UPDATE listings SET <all condition fields> WHERE id = $1 AND seller_id = $2`
- Returns `{ success: true }` on success, `{ error: string }` on failure
- Inspection PDF upload is handled separately via `addDocumentAction` — called directly by `DocumentUpload` on file drop

**Bug fix required — `original_name` / `file_name` mismatch (affects all document types):**

The `listing_documents` table column is `file_name`, but five places reference the non-existent `original_name` and must all be corrected together:

1. `addDocumentAction` in `app/actions/listings.ts` — change insert field from `original_name: originalName` to `file_name: originalName`; rename the parameter from `originalName` to `fileName` for clarity
2. `DocumentUploadProps.initialDocs` type in `components/listings/DocumentUpload.tsx` — change `original_name: string` to `file_name: string`; update internal `DocumentItem.originalName` → `fileName` and the mapping that reads `d.original_name` → `d.file_name`
3. `StepDocuments.tsx` `initialDocs` prop type — change `original_name: string` to `file_name: string`
4. The `listing_documents(...)` select string in `app/(seller)/seller/listings/[id]/edit/page.tsx` — change `original_name` to `file_name` in the Supabase query
5. The inline `initialDocs` type cast in `components/listings/wizard/ListingWizard.tsx` — change `original_name` to `file_name`

---

## Component Structure

### New files

| File | Purpose |
|------|---------|
| `components/listings/wizard/StepCondition.tsx` | Main step component |
| `components/listings/wizard/steps.ts` | Shared `Step` type + `STEPS` array (extracted from wizard) |

### Modified files

| File | Change |
|------|--------|
| `lib/validations/listing.ts` | Add `conditionStepSchema` + `ConditionStepInput` |
| `app/actions/listings.ts` | Add `updateConditionAction`; fix `file_name` bug in `addDocumentAction` (write path) |
| `components/listings/DocumentUpload.tsx` | Add `lockedDocumentType?: string` prop; fix `original_name` → `file_name` in prop type + internal mapping; re-theme from dark zinc to warm light palette |
| `components/listings/wizard/StepDocuments.tsx` | Fix `original_name` → `file_name` in `initialDocs` prop type |
| `app/(seller)/seller/listings/[id]/edit/page.tsx` | Extend Supabase query to select all new condition columns; fix `original_name` → `file_name` in the `listing_documents(...)` select string |
| `components/listings/wizard/ListingWizard.tsx` | Add `'condition'` step; render `<StepCondition>`; import Step type from `steps.ts`; extend edit-page query to select all new condition columns and pass them as `initialData` to `StepCondition` |
| `components/listings/wizard/WizardProgress.tsx` | Add "Condition" step label; import Step type from `steps.ts` |
| `components/listings/DocumentUpload.tsx` | Add optional `lockedDocumentType?: string` prop; when present, hide the type `<select>` and pass the locked value through to `addDocumentAction` |
| `supabase/migrations/009_condition_fields.sql` | New migration |

---

## Initial Data (Edit Flow)

`StepCondition` accepts an `initialData?: Partial<ConditionStepInput>` prop.

The edit page at `app/(seller)/seller/listings/[id]/edit/page.tsx` already fetches the listing row and passes it to `ListingWizard` as `initialData`. The Supabase query in that page must be extended to `SELECT` all new condition columns. `ListingWizard` then passes them through to `StepCondition` as `initialData`, exactly as it does for `StepVehicleDetails`.

`useForm` `defaultValues` are populated from `initialData` so that reopening a draft pre-fills all condition fields.

---

## StepCondition Component Design

**Pattern:** Matches existing steps exactly — `'use client'`, `useForm` + `zodResolver`, `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` wrappers, warm light color palette.

**UI sections** (each in a `rounded-xl border border-[#e7e5e4] bg-white p-6` card with bold heading + muted description line, separated by `mb-6` spacing):

### 1. Overall Grade
- Grade picker: 5 styled buttons (Excellent / Good / Fair / Poor / Salvage), controlled via `setValue('overall_grade', ...)`; selected state shown with blue border + blue text
- Hint text below the picker describing what the selected grade means
- `overall_notes` textarea (optional)

### 2. Exterior
- 3-column grid (`grid-cols-1 sm:grid-cols-3`): `paint_condition` (required *), `body_condition` (required *), `glass_condition` (optional) — native `<select>` in `FormField`
- `exterior_notes` textarea (optional)

### 3. Interior
- 3-column grid: `seat_condition` (required *), `dashboard_condition`, `carpet_condition` (optional)
- `interior_notes` textarea (optional)

### 4. Mechanical
- 3-column grid: `engine_condition` (required *), `transmission_condition`, `brake_condition`
- 2-column grid: `tire_condition`, `tire_tread_depth` number input labelled "Tread Depth (mm)", range 0–12
- `mechanical_notes` textarea (optional)

### 5. Known Issues
- Local `useState` for the text input value
- "Add" button (or Enter key) appends to RHF `known_issues` array via `setValue`
- Chips rendered from the array; ✕ on each chip removes the entry
- Suggestion strip below: common issues as clickable text links that add on click

### 6. Seller Disclosures
- 2-column checkbox grid (`grid-cols-1 sm:grid-cols-2`); each `<input type="checkbox">` wrapped in `FormField`

### 7. Inspection Report
- `<DocumentUpload listingId={listingId} initialDocs={initialInspectionDocs} lockedDocumentType="inspection_report" />`
- Type select is hidden when `lockedDocumentType` is set
- Marked optional with note text
- **Deletion:** Out of scope. Users can upload but not delete an inspection report in this step (consistent with how `StepDocuments` works today). Deletion support can be added in a future pass.
- **Theming:** `DocumentUpload.tsx` currently uses a dark zinc palette (`bg-zinc-800`, `border-zinc-700`, etc.). As part of this work, re-theme it to match the warm light palette (`border-[#e7e5e4]`, `bg-white`, `text-[#1c1917]`, `text-[#78716c]`) so it renders correctly inside the warm-light wizard step cards. This also fixes the visual inconsistency in `StepDocuments`.

### Submit
- `<Button type="submit">` full-width, `bg-blue-600 text-white hover:bg-blue-500`
- Label: "Save & Continue" / "Saving..." while submitting
- Server error in `border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600` block

---

## Responsive Behavior

- All multi-column grids use `grid-cols-1 sm:grid-cols-2` or `grid-cols-1 sm:grid-cols-3`
- Cards stack vertically with consistent `mb-6` spacing

---

## Out of Scope

- Removing `condition_notes` from `StepVehicleDetails` (kept for backwards compatibility with existing drafts; clean up in a future pass)
- AI-assisted grading (the existing `grade` / `grade_source` / `graded_at` columns are untouched)
- Surfacing new condition fields in the storefront filters (separate feature)
