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
- No changes to any other existing steps

---

## Data Model

### Migration: `supabase/migrations/003_condition_fields.sql`

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
  ADD COLUMN tire_tread_depth       int  CHECK (tire_tread_depth BETWEEN 0 AND 20),
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

-- Extend document_type enum to support inspection reports
ALTER TABLE public.listing_documents
  DROP CONSTRAINT listing_documents_document_type_check,
  ADD CONSTRAINT listing_documents_document_type_check
    CHECK (document_type IN ('carfax','title','service_history','other','inspection_report'));
```

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
  tire_tread_depth:       z.number().int().min(0).max(20).optional(),
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
- Inspection PDF upload is handled separately via the existing `addDocumentAction` — called directly by the `DocumentUpload` component on file drop

---

## Component Structure

### New files

| File | Purpose |
|------|---------|
| `components/listings/wizard/StepCondition.tsx` | Main step component |

### Modified files

| File | Change |
|------|--------|
| `lib/validations/listing.ts` | Add `conditionStepSchema` + `ConditionStepInput` |
| `app/actions/listings.ts` | Add `updateConditionAction` |
| `components/listings/wizard/ListingWizard.tsx` | Add `'condition'` step, render `<StepCondition>` |
| `components/listings/wizard/WizardProgress.tsx` | Add "Condition" step label |
| `supabase/migrations/003_condition_fields.sql` | New migration |

---

## StepCondition Component Design

**Pattern:** Matches existing steps exactly — `'use client'`, `useForm` + `zodResolver`, `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` wrappers, warm light color palette.

**UI sections** (each in a `rounded-xl border border-[#e7e5e4] bg-white p-6` card with bold heading + muted description):

### 1. Overall Grade
- Grade picker: 5 styled buttons (Excellent / Good / Fair / Poor / Salvage), controlled via `setValue('overall_grade', ...)`; selected state shown with blue border + blue text
- Description hint below the picker explaining the selected grade
- `overall_notes` textarea (optional)

### 2. Exterior
- 3-column grid: `paint_condition` (required), `body_condition` (required), `glass_condition` (optional) — native `<select>` in `FormField`
- `exterior_notes` textarea (optional)

### 3. Interior
- 3-column grid: `seat_condition` (required), `dashboard_condition`, `carpet_condition` (optional)
- `interior_notes` textarea (optional)

### 4. Mechanical
- 3-column grid: `engine_condition` (required), `transmission_condition`, `brake_condition`
- 2-column grid: `tire_condition`, `tire_tread_depth` (number input, mm)
- `mechanical_notes` textarea (optional)

### 5. Known Issues
- Local `useState` for the text input value
- "Add" button appends to RHF `known_issues` array via `setValue`
- Chips rendered from the array; ✕ on each chip removes the entry
- Suggestion strip below with common issues as clickable text links (add on click)

### 6. Seller Disclosures
- 2-column checkbox grid; each `<input type="checkbox">` wrapped in `FormField`

### 7. Inspection Report
- Reuses `<DocumentUpload>` component with `documentType` prop locked to `'inspection_report'`
- Marked optional with note text

### Submit
- `<Button type="submit">` full-width, `bg-blue-600 text-white hover:bg-blue-500`
- Label: "Save & Continue" / "Saving..." while submitting
- Server error displayed in `border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600` block

---

## Responsive Behavior

- All multi-column grids collapse to single column on mobile (`grid-cols-1 sm:grid-cols-2` / `sm:grid-cols-3`)
- Cards stack vertically with consistent `mb-6` spacing

---

## Out of Scope

- Removing `condition_notes` from `StepVehicleDetails` (kept for backwards compatibility with existing drafts; can be cleaned up in a future pass)
- AI-assisted grading (the existing `grade` / `grade_source` / `graded_at` columns are untouched)
- Surfacing condition fields in the storefront filters (separate feature)
