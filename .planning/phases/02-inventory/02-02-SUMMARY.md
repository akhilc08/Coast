---
phase: 02-inventory
plan: "02"
subsystem: seller-listing-wizard
tags: [listings, wizard, upload, dnd, server-actions, seller-dashboard]
dependency_graph:
  requires: [02-01]
  provides: [seller-dashboard, listing-wizard, photo-upload, document-upload, listing-actions]
  affects: [02-03]
tech_stack:
  added: []
  patterns:
    - react-hook-form + zodResolver for multi-step wizard forms
    - Direct browser-to-Supabase Storage upload (bypasses server action 1MB limit)
    - dnd-kit SortableContext + arrayMove for photo reordering
    - react-dropzone for file drop zones
    - Server Actions with auth check + seller_id ownership guard on every mutation
    - Admin client for storage delete (bypasses storage RLS per Pitfall 2)
key_files:
  created:
    - lib/validations/listing.ts
    - lib/nhtsa.ts
    - lib/storage.ts
    - app/actions/listings.ts
    - app/(seller)/layout.tsx
    - app/(seller)/seller/dashboard/page.tsx
    - app/(seller)/seller/listings/new/page.tsx
    - app/(seller)/seller/listings/[id]/edit/page.tsx
    - components/listings/wizard/ListingWizard.tsx
    - components/listings/wizard/WizardProgress.tsx
    - components/listings/wizard/StepVinLookup.tsx
    - components/listings/wizard/StepVehicleDetails.tsx
    - components/listings/wizard/StepPhotos.tsx
    - components/listings/wizard/StepDocuments.tsx
    - components/listings/wizard/StepReview.tsx
    - components/listings/PhotoUploadZone.tsx
    - components/listings/SortablePhoto.tsx
    - components/listings/DocumentUpload.tsx
  modified:
    - tests/listings/listing-schema.test.ts
    - tests/listings/nhtsa.test.ts
    - tests/listings/photo-upload.test.ts
    - tests/listings/document-upload.test.ts
decisions:
  - Dashboard uses two-section table layout (Published / Drafts) — simpler RSC approach, avoids client-side tab state
  - StepVehicleDetails uses price field (dollars) converting to price_cents on save — better UX than asking for cents
  - form action inline wrappers used on dashboard instead of .bind() — Server Actions returning non-void types are not directly assignable to form action prop in Next.js 16
  - detailsStepSchema year max hardcoded to 2100 (not dynamic getFullYear()+1) — avoids hydration mismatch between server/client render
metrics:
  duration: 18 min
  completed_date: "2026-03-10"
  tasks_completed: 2
  files_created: 18
  files_modified: 4
---

# Phase 2 Plan 2: Seller Listing Wizard Summary

**One-liner:** Five-step listing wizard with NHTSA VIN lookup, direct browser-to-Supabase photo upload with dnd-kit reordering, optional PDF document upload, and a wholesaler dashboard with Published/Drafts table sections.

## What Was Built

### Task 1: Libraries and Server Actions

**lib/validations/listing.ts** — `vinStepSchema` (17-char, no I/O/Q regex) and `detailsStepSchema` (make/model required, year 1900-2100, mileage >=0, price_cents >0, optional fields).

**lib/nhtsa.ts** — `parseNhtsaResults` converts NHTSA Results array to flat map by Variable key; returns null when Make/Model missing or year is NaN. `decodeVin` fetches with 24h Next.js cache, returns null on non-ok or network error.

**lib/storage.ts** — `buildStorageKey` uses `crypto.randomUUID()` for unique per-call keys. `getPhotoPublicUrl` constructs URL via browser Supabase client. `isValidDocumentMime` gates on `application/pdf` only.

**app/actions/listings.ts** — 7 Server Actions: `createDraftAction`, `updateListingAction`, `publishListingAction`, `archiveListingAction`, `upsertPhotoPositionsAction`, `deletePhotoAction` (uses admin client for storage bypass), `addDocumentAction`. All verify auth and seller_id ownership.

### Task 2: UI Components

**Seller route group** — `app/(seller)/layout.tsx` with nav header, protected by auth redirect. Dashboard (`/seller/dashboard`) fetches own listings, renders two table sections. New/edit pages delegate to `ListingWizard`.

**ListingWizard** — Local React state for step and draftId. Starts at 'vin' for new listings, 'details' for edits. Threads draftId through to photo/document steps.

**WizardProgress** — Five-step indicator: completed (filled blue), current (outlined blue), future (zinc). Hidden labels on mobile.

**StepVinLookup** — VIN input with validation, calls `decodeVin` (best-effort), then `createDraftAction`. NHTSA failure is non-blocking.

**StepVehicleDetails** — Full details form with price in dollars (converted to cents on save). Pre-fills from initialData for edit mode.

**StepPhotos + PhotoUploadZone** — react-dropzone accepts JPEG/PNG/WebP up to 10MB. Optimistic preview via `URL.createObjectURL`. Inserts `listing_photos` row directly from browser client. dnd-kit `SortableContext` + `arrayMove` for reorder. `upsertPhotoPositionsAction` persists full position array on Continue.

**StepDocuments + DocumentUpload** — PDF-only dropzone with document type selector. Skip button always available. Uploads to `car-documents` bucket, calls `addDocumentAction`.

**StepReview** — Publish calls `publishListingAction` then redirects to dashboard. Save as Draft redirects without publish.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Server Action return type incompatible with form `action` prop**
- **Found during:** Task 2
- **Issue:** `archiveListingAction.bind(null, id)` produces `() => Promise<{success} | {error}>` which TypeScript rejects for `<form action={...}>` — Next.js requires `(formData: FormData) => void | Promise<void>`
- **Fix:** Wrapped in inline async arrow `async () => { 'use server'; await action(id) }` inside the RSC
- **Files modified:** `app/(seller)/seller/dashboard/page.tsx`
- **Commit:** 1252de9

**2. [Rule 2 - Missing] year max in detailsStepSchema changed from dynamic to static**
- **Found during:** Task 1
- **Issue:** `new Date().getFullYear() + 1` in Zod schema would cause server/client hydration mismatch
- **Fix:** Hardcoded `2100` as upper bound (well within practical range)
- **Files modified:** `lib/validations/listing.ts`

## Self-Check: PASSED

Created files verified:
- lib/validations/listing.ts — exists
- lib/nhtsa.ts — exists
- lib/storage.ts — exists
- app/actions/listings.ts — exists
- app/(seller)/layout.tsx — exists
- All wizard components — exist

Commits verified:
- 0186d46 — feat(02-02): add listing schemas, NHTSA lib, storage utils, and Server Actions
- 1252de9 — feat(02-02): build seller layout, dashboard, and listing wizard UI

Tests: 24 passed, 0 failed (`npx vitest run`)
TypeScript: `npx tsc --noEmit` — clean
