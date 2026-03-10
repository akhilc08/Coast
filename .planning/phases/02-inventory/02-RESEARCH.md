# Phase 2: Inventory - Research

**Researched:** 2026-03-10
**Domain:** File upload, drag-and-drop UI, VIN decode, full-text search, URL state management, lightbox gallery, multi-step wizard
**Confidence:** HIGH (core stack verified against live APIs and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Multi-step wizard: 5 steps — VIN Lookup → Vehicle Details → Photos → Documents → Review & Publish
- VIN lookup via NHTSA API (free, no auth): `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json`
- VIN auto-advances to step 2 on success; manual fill allowed on failure
- Drag & drop photo upload with reorderable positions; first photo = hero; max 20; delete per photo
- Document step is optional (wholesaler can publish without docs)
- Public storefront — no login required to browse
- Sidebar filters on desktop, bottom drawer on mobile
- Instant filtering — URL params update as user changes filters (no Apply button)
- Filter options: make (multiselect), year range, price range, mileage range, condition (notes presence)
- Sort: price asc/desc, mileage asc, newest first (default)
- Active filter chips below search bar
- Listing grid: 3 col desktop / 2 col tablet / 1 col mobile; pagination at bottom (not infinite scroll)
- Listing cards: hero photo, year/make/model, mileage, grade badge ("Grade Pending"), price
- Vehicle detail page: lightbox photo gallery, all vehicle info, grade placeholder, documents section, Buy CTA (auth-gated)
- Wholesaler dashboard layout: Claude's Discretion (table or cards, draft vs published sections, quick actions)
- Dark theme: `bg-zinc-950 text-zinc-50` throughout

### Claude's Discretion
- Wholesaler dashboard layout — table or card view, how to present draft vs published sections, quick actions UI

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within Phase 2 scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIST-01 | Wholesaler can create a listing with core details (VIN, make, model, year, mileage, color, price, condition notes) | Multi-step wizard pattern; existing listings table schema (002_schema.sql) is ready |
| LIST-02 | VIN auto-fill via NHTSA API populates vehicle details when VIN is entered | NHTSA vPIC API verified live; field mapping documented below |
| LIST-03 | Wholesaler can upload multiple photos per listing | react-dropzone + @dnd-kit/sortable + direct browser→Supabase upload; car-photos bucket (public) exists |
| LIST-04 | Wholesaler can upload documents to a listing (Carfax, service history, title) | Same upload path; car-documents bucket (private) exists; listing_documents table ready |
| LIST-05 | Wholesaler can save a listing as draft before publishing | listings.status = 'draft' already in schema; auto-save on Continue click |
| LIST-06 | Wholesaler can edit and remove their own listings | RLS "wholesalers_manage_own_listings" policy covers UPDATE/DELETE; same wizard reused for edit |
| STOR-01 | Consumer can search listings by make, model, and year via full-text search | Supabase textSearch with GIN index on generated fts column; or ilike for simple queries |
| STOR-02 | Consumer can filter listings by make, year range, price range, mileage range, condition | Supabase chained filters (.eq, .gte, .lte, .not); nuqs for URL state |
| STOR-03 | Consumer can sort listings by price, mileage, and newest first | .order() on Supabase query; sort key in URL params |
| STOR-04 | Consumer can browse a paginated listing grid | .range(from, to) with count: 'exact'; page param in URL |
| STOR-05 | Consumer can view a vehicle detail page with full-screen lightbox photo gallery | yet-another-react-lightbox with next/image render slot |
| STOR-06 | Platform is fully mobile-responsive | Tailwind responsive prefixes; drawer pattern for mobile filters |
| GRADE-01 | Car photos stored in Supabase Storage and served with optimized delivery | car-photos bucket public; Next.js Image with Supabase render/image CDN; remotePatterns already in next.config.ts |
| GRADE-02 | Vehicle detail page shows "Grade Pending" placeholder | listings.grade is nullable; conditional render — show real grade when non-null, placeholder otherwise |
</phase_requirements>

---

## Summary

Phase 2 builds two surfaces on top of the established Phase 1 foundation: a wholesaler listing management wizard (protected, role=wholesaler) and a public consumer storefront. All database tables, RLS policies, and storage buckets were created in Phase 1 migrations — Phase 2 is entirely UI and query work with no new migrations required for the core feature set. One optional migration adds a full-text search column to listings.

The primary technical challenges are: (1) the photo upload step, which requires coordinating drag-and-drop reordering (dnd-kit) with batch file upload to Supabase Storage from the browser client; (2) the URL-driven filter state on the storefront, best handled by nuqs which provides type-safe useQueryState hooks that sync with Next.js App Router search params; and (3) the lightbox gallery on the vehicle detail page, handled by yet-another-react-lightbox with a next/image render slot for CDN optimization.

The NHTSA VIN decode API is free, requires no authentication, and returns ~130 fields. The five fields relevant to the listing form are Make, Model, ModelYear, Body Class, and Trim — all verified via a live API call. The wizard uses local React state for step management (not URL-based steps) because the draft is saved to the database on each Continue click and the wizard is not a shareable URL.

**Primary recommendation:** Direct browser-to-Supabase Storage uploads (authenticated anon key + RLS), nuqs for filter URL state, @dnd-kit/sortable for photo reordering, yet-another-react-lightbox for the detail page gallery, and Supabase textSearch with a generated fts column for search.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | ^6.x | Drag sensor management (pointer, touch, keyboard) | Accessibility-first, React 19 compatible, used by Vercel/Linear |
| `@dnd-kit/sortable` | ^8.x | SortableContext + useSortable hook for reorderable grid | Thin preset over core; arrayMove built in |
| `@dnd-kit/utilities` | ^3.x | CSS.Transform.toString() for smooth drag animations | Required companion to sortable |
| `react-dropzone` | ^14.x | Drag-and-drop file input zone with accept/maxFiles | De-facto standard React file drop library; 10M weekly downloads |
| `yet-another-react-lightbox` | ^3.x | Full-screen photo lightbox with keyboard/touch nav | Best performance/bundle ratio; native next/image slot |
| `nuqs` | ^2.x | Type-safe URL search param state (useQueryState) | Used by Supabase, Vercel, Clerk; ~6kb gzip; RSC-aware |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@dnd-kit/core` sensors | built-in | PointerSensor + KeyboardSensor | Always — required for accessibility |
| Supabase Image Transformations | built-in (Supabase) | On-the-fly resize via render/image CDN URL | Thumbnail variants on listing cards |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `nuqs` | Raw `useSearchParams` + `router.replace` | nuqs handles batching, parsing, defaults, and RSC — raw approach requires manual coordination |
| `yet-another-react-lightbox` | `react-image-lightbox` | YARL is actively maintained and React 19 compatible; react-image-lightbox is archived |
| `@dnd-kit/sortable` | `react-beautiful-dnd` | react-beautiful-dnd is deprecated and unmaintained; dnd-kit is the successor |
| Direct browser upload | Server action + FormData | Next.js server actions have a 1MB body limit by default — impractical for photos; direct browser upload with authenticated anon client is correct |

### Installation

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-dropzone yet-another-react-lightbox nuqs
```

---

## Architecture Patterns

### Recommended Route Structure

```
app/
├── (public)/
│   ├── layout.tsx                  # existing dark layout — storefront shares it
│   ├── page.tsx                    # existing home placeholder — replace with storefront
│   └── listings/
│       └── [id]/
│           └── page.tsx            # vehicle detail page (RSC, server fetch)
├── (seller)/
│   ├── layout.tsx                  # seller shell layout with nav
│   └── seller/
│       ├── dashboard/
│       │   └── page.tsx            # listing management table/cards
│       └── listings/
│           ├── new/
│           │   └── page.tsx        # multi-step wizard (new listing)
│           └── [id]/
│               └── edit/
│                   └── page.tsx    # same wizard component, edit mode
├── api/
│   └── listings/
│       └── route.ts                # optional: POST for draft save if needed
lib/
├── validations/
│   └── listing.ts                  # Zod schemas for each wizard step
├── queries/
│   └── listings.ts                 # shared Supabase query functions (server-side)
components/
├── listings/
│   ├── wizard/
│   │   ├── ListingWizard.tsx       # wizard shell — manages step state
│   │   ├── StepVinLookup.tsx
│   │   ├── StepVehicleDetails.tsx
│   │   ├── StepPhotos.tsx
│   │   ├── StepDocuments.tsx
│   │   └── StepReview.tsx
│   ├── PhotoUploadZone.tsx         # dropzone + dnd-kit sortable grid
│   ├── SortablePhoto.tsx           # individual draggable photo item
│   └── DocumentUpload.tsx          # simple file drop for PDFs
├── storefront/
│   ├── ListingGrid.tsx             # responsive card grid
│   ├── ListingCard.tsx             # card with hero photo, details, grade badge
│   ├── StorefrontFilters.tsx       # sidebar on desktop
│   ├── FilterDrawer.tsx            # bottom sheet on mobile
│   ├── SearchBar.tsx               # make/model/year search input
│   ├── ActiveFilterChips.tsx       # dismissible chip row
│   └── PhotoGallery.tsx            # lightbox wrapper for detail page
└── ui/
    └── GradeBadge.tsx              # "Grade Pending" pill + future grade display
```

### Pattern 1: Multi-Step Wizard with Local State + DB Auto-Save

**What:** Wizard tracks current step in local React state (useState). Each Continue click calls a Server Action that upserts the listing draft to the database and returns the listing ID (for subsequent steps). The listing ID is stored in component state after step 1's save.

**When to use:** When the form is stateful per-session, the URL does not need to be shareable between steps, and steps depend on prior step data (listing ID required for photo/document uploads in steps 3-4).

**Why local state over URL steps:** URL-based steps would expose draft listing IDs in the URL before publish, require redirect on each step (adds latency), and complicate the VIN auto-advance transition. Local state is simpler and correct here.

```typescript
// components/listings/wizard/ListingWizard.tsx
'use client'

type Step = 'vin' | 'details' | 'photos' | 'documents' | 'review'
const STEPS: Step[] = ['vin', 'details', 'photos', 'documents', 'review']

export function ListingWizard({ listingId }: { listingId?: string }) {
  const [step, setStep] = useState<Step>('vin')
  const [draftId, setDraftId] = useState<string | null>(listingId ?? null)

  function advance() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  return (
    <div>
      <WizardProgress steps={STEPS} current={step} />
      {step === 'vin'       && <StepVinLookup onSuccess={(id) => { setDraftId(id); advance() }} />}
      {step === 'details'   && <StepVehicleDetails listingId={draftId!} onSave={advance} />}
      {step === 'photos'    && <StepPhotos listingId={draftId!} onSave={advance} />}
      {step === 'documents' && <StepDocuments listingId={draftId!} onSave={advance} />}
      {step === 'review'    && <StepReview listingId={draftId!} />}
    </div>
  )
}
```

### Pattern 2: Direct Browser Upload to Supabase Storage

**What:** Client component uses the browser Supabase client (anon key + user session cookie) to upload files directly to Supabase Storage. RLS on storage.objects enforces wholesaler-only write access. No server action needed for the upload itself.

**Path pattern:** `{listingId}/{uuid}.{ext}` — scoped to listing, unique per file, avoids name collisions.

```typescript
// Inside StepPhotos.tsx — 'use client'
import { createClient } from '@/lib/supabase/browser'
import { v4 as uuidv4 } from 'uuid'

async function uploadPhoto(file: File, listingId: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${listingId}/${uuidv4()}.${ext}`

  const { error } = await supabase.storage
    .from('car-photos')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage.from('car-photos').getPublicUrl(path)
  return data.publicUrl
}
```

After upload, insert a row into `listing_photos` (via Server Action or direct client call — RLS on listing_photos allows wholesaler writes for their own listing).

### Pattern 3: Drag-and-Drop Reorderable Photo Grid

**What:** `DndContext` + `SortableContext` from @dnd-kit wrap a CSS grid of photo cards. `useSortable` provides transform/transition styles and separate drag handle listeners. `arrayMove` reorders the local array on drag end.

```typescript
// components/listings/PhotoUploadZone.tsx (simplified)
'use client'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, rectSortingStrategy,
} from '@dnd-kit/sortable'

export function PhotoUploadZone({ photos, onReorder, onDelete }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = photos.findIndex(p => p.id === active.id)
      const newIdx = photos.findIndex(p => p.id === over.id)
      onReorder(arrayMove(photos, oldIdx, newIdx))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <SortablePhoto key={photo.id} photo={photo} isHero={i === 0} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

### Pattern 4: URL-Driven Filter State with nuqs

**What:** `useQueryStates` from nuqs manages all filter state in URL params with type-safe parsers. Storefront page re-renders server-side when URL changes (RSC re-fetch). The NuqsAdapter is added once to the root layout.

**Setup in root layout (add once):**
```typescript
// app/layout.tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app'
// Wrap children with <NuqsAdapter>
```

**Filter component pattern:**
```typescript
// components/storefront/StorefrontFilters.tsx
'use client'
import { useQueryStates, parseAsInteger, parseAsArrayOf, parseAsString, parseAsStringEnum } from 'nuqs'

const sortValues = ['newest', 'price_asc', 'price_desc', 'mileage_asc'] as const

export function StorefrontFilters() {
  const [filters, setFilters] = useQueryStates({
    q:         parseAsString.withDefault(''),
    makes:     parseAsArrayOf(parseAsString).withDefault([]),
    yearMin:   parseAsInteger,
    yearMax:   parseAsInteger,
    priceMin:  parseAsInteger,
    priceMax:  parseAsInteger,
    mileageMax: parseAsInteger,
    hasNotes:  parseAsString,  // 'true' | null
    sort:      parseAsStringEnum([...sortValues]).withDefault('newest'),
    page:      parseAsInteger.withDefault(1),
  }, { shallow: false })  // shallow: false triggers RSC re-render

  // Each onChange calls setFilters({ fieldName: newValue }) — instant URL update
}
```

### Pattern 5: Supabase Storefront Query with Filters + Pagination

**What:** Server Component reads searchParams (or nuqs server-side parser), builds a typed Supabase query with chained filters, and returns paginated results with total count.

```typescript
// lib/queries/listings.ts
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 12

export async function getListings({
  q, makes, yearMin, yearMax, priceMin, priceMax, mileageMax, hasNotes, sort, page,
}: ListingFilters) {
  const supabase = await createClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('listings')
    .select('*, listing_photos(storage_key, position)', { count: 'exact' })
    .eq('status', 'active')

  if (q)         query = query.textSearch('fts', q, { config: 'simple', type: 'websearch' })
  if (makes?.length) query = query.in('make', makes)
  if (yearMin)   query = query.gte('year', yearMin)
  if (yearMax)   query = query.lte('year', yearMax)
  if (priceMin)  query = query.gte('price_cents', priceMin * 100)
  if (priceMax)  query = query.lte('price_cents', priceMax * 100)
  if (mileageMax) query = query.lte('mileage', mileageMax)
  if (hasNotes === 'true') query = query.not('condition_notes', 'is', null)

  const orderCol = sort === 'price_asc' ? 'price_cents'
    : sort === 'price_desc' ? 'price_cents'
    : sort === 'mileage_asc' ? 'mileage'
    : 'created_at'
  const ascending = sort === 'price_asc' || sort === 'mileage_asc'

  query = query.order(orderCol, { ascending }).range(from, to)

  const { data, count, error } = await query
  return { listings: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE }
}
```

### Pattern 6: Lightbox Gallery on Vehicle Detail Page

**What:** `yet-another-react-lightbox` loaded with `next/dynamic` (deferred bundle). Uses next/image as the render slot for CDN optimization.

```typescript
// components/storefront/PhotoGallery.tsx
'use client'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useState } from 'react'
import 'yet-another-react-lightbox/styles.css'

const Lightbox = dynamic(() => import('yet-another-react-lightbox'), { ssr: false })

export function PhotoGallery({ photos }: { photos: { url: string }[] }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const slides = photos.map(p => ({ src: p.url }))

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <button key={i} onClick={() => { setIndex(i); setOpen(true) }}>
            <Image src={p.url} alt="" width={400} height={300} className="rounded object-cover" />
          </button>
        ))}
      </div>
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
      />
    </>
  )
}
```

### Anti-Patterns to Avoid

- **Server action for photo upload:** Next.js server actions have a 1MB default body limit — multi-photo upload will fail silently or error. Upload directly from the browser client using the authenticated anon session.
- **URL-based wizard steps:** Adds round-trip latency, makes VIN auto-advance awkward, exposes draft IDs, and requires redirect coordination. Local state is correct.
- **Full page re-render on filter change with `shallow: true`:** Filters must trigger RSC re-render to re-run the server Supabase query. Use `shallow: false` in nuqs.
- **Storing photo public URLs in listing_photos:** The schema stores `storage_key` (relative path), not full URLs. Always construct the public URL at render time via `getPublicUrl(storage_key)`. This prevents broken URLs if the Supabase project URL ever changes.
- **Not debouncing text search input:** Full-text search on every keystroke fires too many queries. Debounce the text input 300–500ms or use nuqs `throttleMs` option.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reordering | Custom mousedown/mousemove/mouseup | `@dnd-kit/sortable` | Touch events, keyboard accessibility, scroll boundaries, drop animation all handled |
| File drop zone | HTML `ondragover`/`ondrop` + click-to-pick | `react-dropzone` | MIME type validation, multi-file batching, disabled state, file size limits |
| Photo lightbox | Custom modal + keyboard nav | `yet-another-react-lightbox` | Arrow keys, swipe, preloading, focus trap, ESC close — 100+ edge cases |
| URL filter state sync | Manual `URLSearchParams` + `router.replace` | `nuqs` | Type coercion, batching, defaults, RSC compatibility, no flash on load |
| VIN decode | Scraping DMV sites | NHTSA vPIC API | Free, government source, 130+ fields, no auth, no rate limit for normal use |
| Image CDN resize | Sharp in a Route Handler | Supabase Storage render/image transform | No compute cost, CDN-cached, WebP auto-negotiation |

**Key insight:** The photo upload + reorder combination looks simple but involves coordination between three concerns: file input (dropzone), visual order (dnd-kit), and remote state (database position column). Each library handles its own concern cleanly — don't attempt to unify them into a custom solution.

---

## Common Pitfalls

### Pitfall 1: RLS Blocks Photo Upload Without Listing Row

**What goes wrong:** Wholesaler opens wizard, uploads a photo on step 3, but the listing row doesn't exist yet if step 2's save failed or was skipped. The `listing_photos` RLS policy checks `EXISTS (SELECT 1 FROM listings WHERE id = listing_photos.listing_id AND seller_id = auth.uid())` — upload fails with a policy violation.

**Why it happens:** Draft creation must happen before any related rows can be inserted. Step 1 (VIN) must save the draft listing before step 3 (Photos) can proceed.

**How to avoid:** Create the draft listing row at the END of step 1 (or step 2 at the latest). The listing ID returned from that save is threaded through to subsequent steps. Never allow photo upload before the listing row exists.

**Warning signs:** `new row violates row-level security policy for table "listing_photos"` in Supabase logs.

---

### Pitfall 2: car-photos bucket has `car_photos_wholesaler_delete` Policy Without Owner Check

**What goes wrong:** The current migration's delete policy allows any wholesaler to delete any photo in the bucket (not scoped to their own files). A malicious wholesaler could delete a competitor's photos.

**Why it happens:** The storage.objects table doesn't have a direct `seller_id` column — ownership must be inferred from the path (which contains listing ID) or from the listing_photos metadata.

**How to avoid:** Scope deletes through the listing_photos table row deletion, not direct storage.objects DELETE. Use a Server Action that: (1) verifies the listing belongs to the current user, (2) deletes from storage using the admin client, (3) deletes the listing_photos row. Do not expose direct storage delete to the client.

**Warning signs:** If implementing client-side delete with the anon client, any wholesaler session can delete any file in car-photos.

---

### Pitfall 3: NHTSA API Returns ~130 Fields — Many Null

**What goes wrong:** Code tries to access `results.Make` directly but the API returns an array of objects, not a flat object. Each result item is `{ Variable: "Make", Value: "HONDA", ValueId: "..." }`. Direct property access returns undefined.

**Why it happens:** The API response structure is `{ Results: Array<{ Variable: string; Value: string; ValueId: string }> }`. Must convert to a map.

**How to avoid:**
```typescript
const map = Object.fromEntries(
  data.Results.map((r: { Variable: string; Value: string }) => [r.Variable, r.Value])
)
const make  = map['Make']          // "HONDA"
const model = map['Model']         // "Accord"
const year  = map['Model Year']    // "2003"  (string — parse to int)
const body  = map['Body Class']    // "Coupe"
const trim  = map['Trim']          // "EX-V6"
```

**Warning signs:** All NHTSA fields resolve to `undefined` despite a 200 response.

---

### Pitfall 4: next.config.ts remotePatterns Only Covers Public Storage Path

**What goes wrong:** `next/image` works for public car-photos URLs (`/storage/v1/object/public/car-photos/...`) but the current remotePattern uses `/storage/v1/object/public/**`. Image transformation URLs use a different path: `/storage/v1/render/image/public/...`. The Image component will throw an "invalid src" error for transformed URLs.

**Why it happens:** The existing remotePattern in next.config.ts covers `pathname: '/storage/v1/object/public/**'` but Supabase image transformations use `/storage/v1/render/image/public/**`.

**How to avoid:** Add a second remotePattern entry (or widen the pathname pattern) in next.config.ts:
```typescript
{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/render/image/public/**' }
```

**Warning signs:** `Error: Invalid src prop` on next/image components showing Supabase transformation URLs.

---

### Pitfall 5: nuqs Filter State Doesn't Trigger RSC Re-Render

**What goes wrong:** Filter changes update the URL but the listing grid doesn't update — it shows stale results.

**Why it happens:** nuqs defaults to `shallow: true` for performance (updates URL without React Router navigation, no RSC re-render). The storefront needs a full RSC re-render to re-run the server-side Supabase query.

**How to avoid:** Pass `shallow: false` in the useQueryStates options object. This triggers Next.js navigation on URL change, re-running the Server Component with new searchParams.

**Warning signs:** URL bar changes correctly but listing grid stays the same until manual page refresh.

---

### Pitfall 6: Position Column Drift After Photo Delete

**What goes wrong:** Wholesaler uploads 5 photos (positions 0–4), deletes position 2. Positions in DB are now 0, 1, 3, 4. Hero is still position 0 correctly, but re-ordering breaks if code assumes contiguous integers.

**Why it happens:** Deleting a photo removes one row without renumbering siblings.

**How to avoid:** After any delete or reorder, always write the full position array back to the DB for all remaining photos. Use an upsert of all `{id, position}` pairs (not an increment/decrement of the deleted item's neighbors). Sort by position at query time, never assume contiguity.

---

## Code Examples

### NHTSA VIN Decode — Fetch and Parse

```typescript
// lib/nhtsa.ts
export interface VehicleDetails {
  make: string; model: string; year: number;
  bodyClass: string; trim: string;
}

export async function decodeVin(vin: string): Promise<VehicleDetails | null> {
  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`,
    { next: { revalidate: 86400 } }  // cache decoded VINs for 24h
  )
  if (!res.ok) return null
  const data = await res.json()

  const map = Object.fromEntries(
    (data.Results as { Variable: string; Value: string }[])
      .map(r => [r.Variable, r.Value])
  )

  const year = parseInt(map['Model Year'], 10)
  if (!map['Make'] || !map['Model'] || !year) return null

  return {
    make:      map['Make'],
    model:     map['Model'],
    year,
    bodyClass: map['Body Class'] ?? '',
    trim:      map['Trim'] ?? '',
  }
}
```

### Supabase Storage Upload with Unique Path

```typescript
// Used inside a 'use client' component
import { createClient } from '@/lib/supabase/browser'

export async function uploadListingPhoto(file: File, listingId: string) {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storageKey = `${listingId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('car-photos')
    .upload(storageKey, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
  if (error) throw new Error(error.message)
  return storageKey  // store this in listing_photos.storage_key, NOT the full URL
}

export function getPhotoUrl(storageKey: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from('car-photos').getPublicUrl(storageKey)
  return data.publicUrl
}
```

### react-dropzone Configuration for Photos

```typescript
// Inside StepPhotos.tsx
import { useDropzone } from 'react-dropzone'

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png':  ['.png'],
    'image/webp': ['.webp'],
  },
  maxFiles: 20,
  maxSize: 10 * 1024 * 1024,  // 10MB — matches car-photos bucket limit
  multiple: true,
  onDrop: async (acceptedFiles) => {
    // Upload each file, then insert listing_photos rows
  },
})
```

### Supabase Full-Text Search Migration (optional but recommended)

```sql
-- Add to a new migration file: 004_fts_index.sql
ALTER TABLE public.listings
ADD COLUMN fts tsvector GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce(make, '') || ' ' || coalesce(model, '') || ' ' || coalesce(year::text, '')
  )
) STORED;

CREATE INDEX idx_listings_fts ON public.listings USING GIN (fts);
```

Then query:
```typescript
query = query.textSearch('fts', searchTerm, { config: 'simple', type: 'websearch' })
```

**Alternative without migration (simpler, fine for <10k listings):** Use `.ilike('make', `%${q}%`)` combined with `.or()` for make/model. Acceptable for MVP scale.

### Middleware Role Check for `/seller` Routes

The existing middleware already redirects unauthenticated users from `/seller`. Add role enforcement:

```typescript
// middleware.ts — extend the existing seller guard
if (request.nextUrl.pathname.startsWith('/seller')) {
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  // Role check from JWT app_metadata (injected by Custom Access Token Hook)
  const role = user.app_metadata?.role
  if (role !== 'wholesaler' && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
```

Note: `user.app_metadata.role` is available in middleware because the Custom Access Token Hook (registered in Phase 1) injects it into every JWT before issue. No additional DB lookup needed.

---

## NHTSA API Field Reference

Verified against live API call to `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/1HGCM82633A004352?format=json` (2003 Honda Accord):

| Variable Name (exact) | Example Value | Used For |
|----------------------|---------------|---------|
| `Make` | `HONDA` | Auto-fill make field |
| `Model` | `Accord` | Auto-fill model field |
| `Model Year` | `2003` | Auto-fill year field (parse to int) |
| `Body Class` | `Coupe` | Auto-fill body style |
| `Trim` | `EX-V6` | Auto-fill trim field |
| `Doors` | `2` | Supplemental info |
| `Transmission Style` | `Automatic` | Supplemental info |
| `Engine Number of Cylinders` | `6` | Supplemental info |
| `Displacement (L)` | `2.998...` | Supplemental info |
| `Fuel Type - Primary` | `Gasoline` | Supplemental info |

All values come from `data.Results` array as `{ Variable, Value, ValueId }` objects. Empty/unavailable fields have `Value: ""` or `Value: "Not Applicable"`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-beautiful-dnd` | `@dnd-kit/sortable` | 2022 (rbd deprecated) | Accessibility, React 19 support, grid layouts |
| `react-image-lightbox` | `yet-another-react-lightbox` | 2022 (rimage archived) | Active maintenance, SSR safe |
| Manual `useSearchParams` + router | `nuqs` | 2023 (nuqs v2 stable) | Type safety, RSC awareness, no boilerplate |
| `react-query` for server state | Next.js RSC + `fetch` | 2023 (App Router stable) | Server Components handle server data directly |
| Sharp in API route for resize | Supabase image transformations | 2023 | Zero compute cost, CDN-cached WebP |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Archived, no React 18/19 support — do not use
- `react-image-lightbox`: Archived — do not use
- `URL.searchParams` + manual `router.replace` for filter state: Replaced by nuqs in this stack

---

## Open Questions

1. **Image compression: client-side vs pass-through**
   - What we know: The car-photos bucket accepts up to 10MB per file (set in migration 003). Supabase image transformations handle serve-time resize.
   - What's unclear: Whether photos should be compressed client-side (before upload) to reduce storage cost and future AI grading input fidelity.
   - Recommendation: For Phase 2, upload raw files (up to 10MB). The STATE.md flags this as a known blocker concern for Phase 3 grading. Serve thumbnails via Supabase render/image transforms on the storefront. Revisit compression strategy before Phase 4 grading activation.

2. **Full-text search: generated fts column vs ilike fallback**
   - What we know: GIN-indexed tsvector search is significantly faster (0.135ms vs 0.3ms for ilike per Supabase benchmarks). Requires a new migration (004).
   - What's unclear: Whether inventory scale in Phase 2 will ever stress the difference.
   - Recommendation: Add the fts migration (004_fts_index.sql) at the start of Phase 2 since it's trivial to add now and expensive to add later on a large table. Use textSearch with `config: 'simple'` (not 'english') so "Honda" matches "HONDA" regardless of stemming.

3. **Wholesaler dashboard layout (Claude's Discretion)**
   - What we know: Must show draft vs active vs archived listings; quick actions needed (edit, publish, archive/delete).
   - Recommendation: Table layout — more information density than cards, easier to scan multiple listings, standard for data management UIs. Two tabs or sections: "Published" and "Drafts". Actions: Edit (links to wizard in edit mode), Archive (status → archived), and Publish (status → active from draft).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (unit) + Playwright 1.58.x (E2E) |
| Config file | `vitest.config.ts` (tests/**/*.test.ts only) / `playwright.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIST-01 | Listing Zod schema validates required fields and rejects invalid data | unit | `npx vitest run tests/listings/listing-schema.test.ts` | ❌ Wave 0 |
| LIST-02 | NHTSA VIN decode parses Results array into flat object correctly | unit | `npx vitest run tests/listings/nhtsa.test.ts` | ❌ Wave 0 |
| LIST-02 | VIN lookup failure returns null, not throws | unit | `npx vitest run tests/listings/nhtsa.test.ts` | ❌ Wave 0 |
| LIST-03 | Photo upload path pattern generates unique storage keys per listing | unit | `npx vitest run tests/listings/photo-upload.test.ts` | ❌ Wave 0 |
| LIST-03 | Reorder produces correct position array after arrayMove | unit | `npx vitest run tests/listings/photo-reorder.test.ts` | ❌ Wave 0 |
| LIST-04 | Document upload accepts PDF MIME type, rejects non-PDF | unit | `npx vitest run tests/listings/document-upload.test.ts` | ❌ Wave 0 |
| LIST-05 | Wholesaler can create draft and resume wizard | E2E | `npx playwright test tests/listings/create-draft.spec.ts` | ❌ Wave 0 |
| LIST-06 | Wholesaler can edit listing and publish/archive | E2E | `npx playwright test tests/listings/manage-listings.spec.ts` | ❌ Wave 0 |
| STOR-01 | getListings query with search term filters by fts column | unit | `npx vitest run tests/storefront/listings-query.test.ts` | ❌ Wave 0 |
| STOR-02 | getListings applies price, year, mileage, make filters correctly | unit | `npx vitest run tests/storefront/listings-query.test.ts` | ❌ Wave 0 |
| STOR-03 | getListings orders by price_asc/desc, mileage_asc, newest | unit | `npx vitest run tests/storefront/listings-query.test.ts` | ❌ Wave 0 |
| STOR-04 | getListings returns correct range slice and total count | unit | `npx vitest run tests/storefront/listings-query.test.ts` | ❌ Wave 0 |
| STOR-05 | Vehicle detail page renders lightbox on photo click | E2E | `npx playwright test tests/storefront/vehicle-detail.spec.ts` | ❌ Wave 0 |
| STOR-06 | Storefront filter drawer appears on mobile viewport | E2E | `npx playwright test tests/storefront/mobile-responsive.spec.ts` | ❌ Wave 0 |
| GRADE-01 | Photo URLs resolve to Supabase CDN public URL format | unit | `npx vitest run tests/listings/photo-upload.test.ts` | ❌ Wave 0 |
| GRADE-02 | Grade badge shows "Grade Pending" when grade is null | unit | `npx vitest run tests/storefront/grade-badge.test.ts` | ❌ Wave 0 |

### Manual Verification Checkpoints

| Feature | Manual Check |
|---------|-------------|
| Photo drag-and-drop | Drag photo to new position, confirm order persists after page reload (DB updated) |
| Batch photo upload | Drop 5+ photos simultaneously, confirm all appear with correct previews |
| VIN auto-advance | Enter a valid VIN, confirm step auto-advances with make/model/year pre-filled |
| Document upload + skip | Upload a PDF doc, then try publishing without doc (should succeed) |
| Filter chips | Apply multiple filters, click chip to dismiss one — URL and grid both update |
| Mobile filter drawer | On 375px viewport, "Filters" button appears, tapping opens bottom drawer |
| Lightbox navigation | Click photo → lightbox opens; left/right arrows advance; ESC closes |
| Buy CTA visibility | Logged-out user sees no Buy button; logged-in consumer sees it; wholesaler sees it hidden |

### Sampling Rate

- **Per task commit:** `npx vitest run` (unit tests only, ~2-5s)
- **Per wave merge:** `npx vitest run && npx playwright test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (files to create before/during implementation)

- [ ] `tests/listings/listing-schema.test.ts` — covers LIST-01 (Zod schema validation)
- [ ] `tests/listings/nhtsa.test.ts` — covers LIST-02 (VIN decode parse logic with fixture data)
- [ ] `tests/listings/photo-upload.test.ts` — covers LIST-03, GRADE-01 (storage key generation, URL construction)
- [ ] `tests/listings/photo-reorder.test.ts` — covers LIST-03 (arrayMove position logic)
- [ ] `tests/listings/document-upload.test.ts` — covers LIST-04 (MIME type validation)
- [ ] `tests/storefront/listings-query.test.ts` — covers STOR-01, STOR-02, STOR-03, STOR-04 (query builder logic with mocked Supabase client)
- [ ] `tests/storefront/grade-badge.test.ts` — covers GRADE-02 (conditional rendering)
- [ ] `tests/listings/create-draft.spec.ts` — E2E, covers LIST-05
- [ ] `tests/listings/manage-listings.spec.ts` — E2E, covers LIST-06
- [ ] `tests/storefront/vehicle-detail.spec.ts` — E2E, covers STOR-05
- [ ] `tests/storefront/mobile-responsive.spec.ts` — E2E, covers STOR-06

Note: `nhtsa.test.ts` should use a fixture JSON response (copy of real API response) rather than live network calls — unit tests must not depend on external services.

---

## Sources

### Primary (HIGH confidence)

- NHTSA vPIC API — live call verified: `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/1HGCM82633A004352?format=json`
- Supabase Storage Upload JS reference: `https://supabase.com/docs/reference/javascript/storage-from-upload`
- Supabase Storage Image Transformations: `https://supabase.com/docs/guides/storage/serving/image-transformations`
- Supabase Full Text Search guide: `https://supabase.com/docs/guides/database/full-text-search`
- Supabase textSearch JS reference: `https://supabase.com/docs/reference/javascript/textsearch`
- Supabase select + range + count JS reference: `https://supabase.com/docs/reference/javascript/select`
- yet-another-react-lightbox Next.js example: `https://yet-another-react-lightbox.com/examples/nextjs`
- nuqs adapters (NuqsAdapter setup): `https://nuqs.dev/docs/adapters`
- nuqs basic usage (useQueryState parsers): `https://nuqs.dev/docs/basic-usage`
- dnd-kit sortable docs: `https://dndkit.com/presets/sortable`
- Existing project schema: `supabase/migrations/002_schema.sql`, `supabase/migrations/003_storage_buckets.sql`

### Secondary (MEDIUM confidence)

- Supabase + Next.js file upload pattern: `https://supalaunch.com/blog/file-upload-nextjs-supabase`
- nuqs recognition at React Advanced 2025: `https://www.infoq.com/news/2025/12/nuqs-react-advanced/`
- Supabase resumable uploads guide: `https://supabase.com/docs/guides/storage/uploads/resumable-uploads`

### Tertiary (LOW confidence)

- Performance comparison ilike vs textSearch (0.135ms vs 0.3ms) — from Supabase blog, not independently verified for this schema

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against current docs and live examples; versions confirmed compatible with React 19 and Next.js 16
- NHTSA API fields: HIGH — verified via live API call with real VIN
- Supabase Storage upload pattern: HIGH — verified against official JS reference
- Architecture patterns: HIGH — derived from existing Phase 1 code and official docs
- nuqs filter pattern: HIGH — verified against official docs and adapter examples
- Search performance: MEDIUM — benchmark figures from Supabase blog, not independently measured on this schema
- Pitfalls: HIGH — derived from schema analysis (RLS policies read directly), official caveats, and known Next.js constraints

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable libraries; NHTSA API is a government service — highly stable)
