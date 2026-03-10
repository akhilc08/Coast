# Phase 2: Inventory - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Two surfaces delivered in this phase:
1. **Wholesaler listing management** — create, edit, publish, and remove vehicle listings via a multi-step wizard on a protected dashboard
2. **Consumer storefront** — browse, search, filter, and view listings without requiring login; vehicle detail page with lightbox photo gallery

Document generation, purchase flow, and e-signing are Phase 3. Admin panel is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Authentication & access
- Consumers can browse and search inventory without logging in (public storefront, no auth wall)
- Wholesaler dashboard is protected (authenticated + role=wholesaler)
- "Buy" / purchase CTA on vehicle detail page is visible only to logged-in consumers (Phase 3 wires up payment — Phase 2 scaffolds the button with auth check)

### Listing creation — form structure
- Multi-step wizard with 5 steps: VIN Lookup → Vehicle Details → Photos → Documents → Review & Publish
- Progress indicator at the top of the wizard showing current step
- Auto-save as draft on each Continue click — wholesaler can close and resume

### Listing creation — VIN lookup
- VIN entered on step 1; on successful NHTSA lookup, auto-advance to step 2 with fields pre-filled (make, model, year, body style)
- All pre-filled fields remain editable on step 2
- If VIN lookup fails, show inline error and let wholesaler fill details manually

### Listing creation — photo upload
- Drag & drop zone for batch upload; also supports click-to-pick
- Photos are reorderable via drag handles — first photo = hero/cover image
- Max 20 photos per listing
- Delete button per photo with instant preview removal

### Listing creation — documents
- Step 4: upload Carfax, service history, and/or title documents (PDF)
- Document step is optional — wholesaler can skip and publish without documents

### Consumer storefront — layout
- Sticky top header with Coast logo/nav and search bar (searches make, model, year)
- Below header: sidebar filters on desktop (left), bottom drawer on mobile (tap "Filters" button)
- Main area: listing grid (3 columns desktop, 2 tablet, 1 mobile)
- Pagination at bottom (not infinite scroll — STOR-04 specifies pagination)

### Consumer storefront — filtering
- Filters apply instantly (no Apply button) — URL params update as user changes filters (shareable/bookmarkable URLs)
- Filter options: make (multiselect), year range (min/max), price range (min/max), mileage range (min/max), condition (notes presence)
- Sort: price asc/desc, mileage asc, newest first (default)
- Active filters shown as dismissible chips below the search bar

### Listing cards
- Hero photo, year/make/model, mileage, price, grade badge
- Grade badge shows "Grade Pending" in a neutral pill for now (GRADE-02 placeholder)
- Card links to vehicle detail page on click

### Vehicle detail page
- Full-screen lightbox photo gallery (STOR-05) — click any photo to open lightbox, arrow navigation
- Vehicle info panel: all details (VIN, make, model, year, mileage, color, condition notes, price)
- Grade placeholder section: "Condition Grade — Pending" (GRADE-02)
- Documents section: visible to all visitors, but document download requires login (or Phase 3 purchase)
- Buy CTA button: visible only to authenticated consumers, disabled/hidden for wholesalers and unauthenticated users

### Wholesaler dashboard
- Claude's Discretion: table or card layout, draft vs published sections, quick actions (edit, publish, archive)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx` — shadcn base-nova Card with CardHeader, CardContent, CardFooter — use for listing cards on storefront
- `components/ui/button.tsx`, `input.tsx`, `form.tsx` — use for listing creation wizard forms
- `lib/supabase/browser.ts`, `lib/supabase/server.ts` — Supabase client patterns established; use server client for SSR listing queries
- `lib/validations/auth.ts` — zod schema pattern to follow for listing form validation

### Established Patterns
- Dark theme: `bg-zinc-950 text-zinc-50` — storefront must stay consistent with this palette
- Form pattern: react-hook-form + zodResolver + shadcn Form components — use for all listing creation steps
- Public layout (`app/(public)/layout.tsx`): `min-h-screen bg-zinc-950 text-zinc-50` — storefront pages share this layout

### Integration Points
- `supabase/migrations/003_storage_buckets.sql` — `car-photos` bucket already exists (public), `car-documents` bucket exists (private) — photo/document upload ready to use
- `middleware.ts` — add `/seller/**` route protection (role=wholesaler check)
- NHTSA VIN API: `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json` — free, no auth required
- Listings table schema already includes grade, grade_source, graded_at columns (migration 002) — Grade Pending UI just reads null grade

</code_context>

<specifics>
## Specific Ideas

- Listing card preview mockup chosen: photo on top, then year/make/model, mileage, grade badge, price below
- Storefront filter layout chosen: sidebar on desktop (left column), bottom drawer on mobile
- Wizard step layout chosen: VIN step auto-advances on successful lookup

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within Phase 2 scope

</deferred>

---

*Phase: 02-inventory*
*Context gathered: 2026-03-10*
