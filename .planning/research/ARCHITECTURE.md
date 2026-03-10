# Architecture Patterns

**Domain:** Wholesale car marketplace (admin-onboarded sellers, public buyers, full transaction lifecycle)
**Researched:** 2026-03-09
**Confidence note:** WebSearch and official docs unavailable for this session. All findings are from training data (cutoff August 2025). Confidence levels reflect that limitation honestly.

---

## Recommended Architecture

### High-Level System Map

```
┌─────────────────────────────────────────────────────┐
│                   Next.js (Vercel)                  │
│                                                     │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │  Public Site │  │ Wholesaler │  │ Admin Panel │  │
│  │  /browse     │  │ /seller/*  │  │ /admin/*    │  │
│  │  /listings   │  │            │  │             │  │
│  │  /checkout   │  │            │  │             │  │
│  └──────┬───────┘  └─────┬──────┘  └──────┬──────┘  │
│         │                │                │         │
│         └────────────────┴────────────────┘         │
│                          │                          │
│              ┌───────────▼───────────┐              │
│              │   Next.js Route       │              │
│              │   Handlers / Server   │              │
│              │   Actions             │              │
│              └───────────┬───────────┘              │
└──────────────────────────┼──────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
    │  Supabase   │ │   Stripe    │ │  e-Sign    │
    │  Auth + DB  │ │  Payments   │ │  (TBD)     │
    │  + Storage  │ │             │ │            │
    └─────────────┘ └─────────────┘ └────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Public Storefront | Browse/search listings, view vehicle detail, initiate purchase | Supabase (read listings), Stripe Checkout |
| Wholesaler Portal | Create/edit/delete own listings, upload photos + docs, view own orders | Supabase (write own listings), Supabase Storage |
| Admin Panel | Onboard wholesaler accounts, manage all listings/orders, analytics, handle disputes | Supabase (full access), Stripe (refunds/disputes) |
| Supabase Auth | Session management, role-based JWT claims, RLS enforcement | All Next.js surface areas |
| Supabase DB | Listings, orders, documents metadata, user profiles, grading stubs | Next.js server layer only (never direct from client in sensitive paths) |
| Supabase Storage | Car photos, title docs, Carfax, service records | Next.js server layer for signed URLs; client for direct photo upload with RLS |
| Stripe | Payment collection, order confirmation webhooks | Next.js Route Handlers (webhook endpoint) |
| E-Sign Service | Purchase agreement and title transfer document generation + signing | Triggered post-payment from order webhook handler |
| Grading Scaffold | Receive uploaded images, expose grade field (null until AI service populates) | Supabase DB (grade field on listings), Storage (photo bucket) |

---

## Next.js App Router Structure

**Confidence: HIGH** — App Router is the stable Next.js default since v13.4; route groups and parallel routes are well-established patterns.

```
app/
├── (public)/                    # Public-facing storefront (no auth required)
│   ├── page.tsx                 # Home / hero
│   ├── browse/
│   │   ├── page.tsx             # Listing grid with search + filters
│   │   └── [slug]/
│   │       └── page.tsx         # Vehicle detail page
│   └── checkout/
│       ├── page.tsx             # Stripe Checkout initiation
│       └── success/page.tsx     # Post-payment confirmation
│
├── (seller)/                    # Wholesaler portal (auth: role = wholesaler)
│   ├── layout.tsx               # Auth guard: redirect if not wholesaler
│   ├── dashboard/page.tsx
│   ├── listings/
│   │   ├── page.tsx             # My listings
│   │   ├── new/page.tsx         # Create listing
│   │   └── [id]/edit/page.tsx   # Edit listing
│   └── orders/page.tsx          # Orders for my listings
│
├── (admin)/                     # Admin panel (auth: role = admin)
│   ├── layout.tsx               # Auth guard: redirect if not admin
│   ├── dashboard/page.tsx       # Analytics overview
│   ├── users/
│   │   ├── page.tsx             # All users
│   │   └── [id]/page.tsx        # User detail + role management
│   ├── listings/page.tsx        # All listings (moderate/unpublish)
│   └── orders/page.tsx          # All orders + dispute handling
│
├── api/
│   ├── stripe/
│   │   └── webhook/route.ts     # Stripe webhook handler (order fulfillment)
│   ├── checkout/
│   │   └── route.ts             # Create Stripe Checkout Session (server only)
│   └── grading/
│       └── callback/route.ts    # Future: grading service pushes grade here
│
└── layout.tsx                   # Root layout (fonts, providers, nav shell)
```

**Key App Router decisions:**

- Route groups `(public)`, `(seller)`, `(admin)` share the same URL namespace but apply different layouts and auth guards — no prefix in URLs.
- Auth guards live in `layout.tsx` per group, checking Supabase session + role claim. Server Components make this a single round-trip.
- Stripe webhook handler is a Route Handler, not a Server Action — webhooks are unsigned POST requests and need raw body access for signature verification.
- The grading callback endpoint is scaffolded from day one as a no-op that writes to the `grade` column, so the AI service can be wired in without schema changes later.

---

## Supabase Schema Design

**Confidence: MEDIUM** — Schema design is project-specific, but these patterns follow standard Supabase conventions (RLS on every table, UUID PKs, `auth.users` FK). Stripe Connect nuance noted separately.

### Tables

```sql
-- User profiles (extends auth.users)
profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'consumer'  -- 'consumer' | 'wholesaler' | 'admin'
              CHECK (role IN ('consumer', 'wholesaler', 'admin')),
  full_name   text,
  company     text,   -- wholesalers only
  phone       text,
  created_at  timestamptz DEFAULT now()
)

-- Car listings
listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES profiles(id),
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'sold', 'archived')),
  title           text NOT NULL,            -- e.g. "2019 Toyota Camry SE"
  make            text NOT NULL,
  model           text NOT NULL,
  year            int  NOT NULL,
  mileage         int,
  color           text,
  vin             text UNIQUE,
  price_cents     int  NOT NULL,            -- store in cents; avoid float money bugs
  condition_notes text,
  grade           text,                     -- null until grading service populates
  grade_source    text,                     -- 'ai' | 'manual' | null
  graded_at       timestamptz,
  published_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)

-- Listing photos (ordered)
listing_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  storage_key text NOT NULL,               -- path in Supabase Storage
  position    int  NOT NULL DEFAULT 0,    -- sort order; 0 = hero image
  uploaded_at timestamptz DEFAULT now()
)

-- Listing documents (Carfax, title, service records)
listing_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  document_type text NOT NULL
                CHECK (document_type IN ('carfax', 'title', 'service_history', 'other')),
  storage_key  text NOT NULL,
  file_name    text,
  uploaded_at  timestamptz DEFAULT now()
)

-- Orders
orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            uuid NOT NULL REFERENCES listings(id),
  buyer_id              uuid NOT NULL REFERENCES profiles(id),
  seller_id             uuid NOT NULL REFERENCES profiles(id),  -- denormalized for query simplicity
  status                text NOT NULL DEFAULT 'pending_payment'
                        CHECK (status IN (
                          'pending_payment', 'paid', 'documents_sent',
                          'documents_signed', 'complete', 'cancelled', 'refunded'
                        )),
  price_cents           int  NOT NULL,
  stripe_payment_intent text,              -- for reconciliation
  stripe_checkout_session text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
)

-- Purchase documents (generated post-payment)
order_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  document_type text NOT NULL
                CHECK (document_type IN ('purchase_agreement', 'title_transfer')),
  storage_key   text,                      -- populated after generation
  signed_at     timestamptz,              -- populated after e-sign
  signer_id     uuid REFERENCES profiles(id),
  esign_ref     text,                     -- external e-sign provider envelope ID
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'signed', 'voided'))
)
```

### RLS Policy Structure

```
profiles:   SELECT own row; UPDATE own row; INSERT by auth trigger only
listings:   SELECT active (public); INSERT/UPDATE/DELETE by owner (seller_id = auth.uid())
            Admin: all operations via service_role or admin policy
listing_photos:    manage by listing owner
listing_documents: manage by listing owner; read by buyer after order.status = 'paid'
orders:     SELECT by buyer or seller; INSERT by authenticated consumer; UPDATE by webhook (service_role)
order_documents: SELECT by buyer + seller; mutate via service_role only
```

**RLS enforcement rule:** All sensitive mutations use service_role key in Server Actions or Route Handlers, never the anon key. Client components only read via `select` with RLS narrowing what they see.

---

## Stripe Architecture Decision: Standard vs Connect

**Confidence: MEDIUM** — Stripe documentation is authoritative but unavailable for this session. The following reflects training data as of August 2025.

### Recommendation: Standard Stripe (not Connect) for v1

**Rationale:**

Coast's v1 model has the platform (Coast) collecting all payments and paying wholesalers out-of-band (or not at all in the near term — admin manages settlements manually). This is a valid wholesale marketplace model where:

- Coast charges the consumer.
- Coast owes the wholesaler per their agreement.
- No automated per-transaction split is required.

Stripe Connect is the right choice when:
- Funds must flow automatically to seller accounts on each transaction.
- Sellers need their own Stripe dashboard with payout management.
- Marketplace takes a platform fee per transaction.

Stripe Connect adds significant complexity (Connected Account onboarding, Express vs Standard vs Custom account types, payout delays, 1099 reporting obligations). For a marketplace where admin manages wholesaler relationships and settlements manually, standard Stripe is simpler and ships faster.

**If Connect becomes necessary later** (e.g., automated payouts to wholesalers), migrate to Stripe Connect Express — it gives sellers a lightweight Stripe-hosted dashboard and handles the most compliance burden.

### Standard Stripe Implementation

```
Consumer checkout flow:
  1. Server Action / Route Handler creates Checkout Session (price, metadata: listing_id, buyer_id)
  2. Redirect to Stripe Checkout (hosted page — no PCI scope)
  3. Stripe redirects to /checkout/success?session_id=...
  4. Stripe sends webhook: checkout.session.completed
  5. Webhook handler: verify signature → create order record → update listing status → trigger document generation
```

**Critical:** Never trust the success redirect URL alone to confirm payment. Always use the webhook as the authoritative signal to create the order.

---

## Supabase Storage Structure

**Confidence: HIGH** — Supabase Storage bucket + path conventions are stable.

```
Buckets:
  listings-photos/         (public bucket — images served without auth token)
    {listing_id}/
      {photo_id}.webp

  listings-documents/      (private bucket — signed URLs required)
    {listing_id}/
      carfax-{document_id}.pdf
      title-{document_id}.pdf
      service-{document_id}.pdf

  order-documents/         (private bucket — signed URLs, buyer + seller + admin only)
    {order_id}/
      purchase-agreement.pdf
      title-transfer.pdf
```

**Key decisions:**

- Listing photos in a public bucket — no URL expiry, CDN-cacheable, faster page loads. Photos are not sensitive.
- All PDFs (listing docs, order docs) in private buckets — signed URLs generated server-side, short expiry (e.g., 1 hour). A buyer who didn't purchase should not access the title document.
- `storage_key` in the database stores the path within the bucket (not the full URL). URLs are generated on demand via `supabase.storage.from(bucket).createSignedUrl(key, expiry)`. This decouples the schema from Supabase project URL changes.
- Photo uploads can be done client-side directly to Supabase Storage with a storage RLS policy that restricts to `auth.uid() = owner` — avoids routing large files through Next.js. Document uploads should go through a server action that validates file type and size before signing an upload URL.

---

## Car Grading System Integration Point

**Confidence: HIGH** — This is a scaffold design pattern, not dependent on external library behavior.

The grading system is scaffolded so v1 ships without AI grading but the infrastructure accepts the service when it is ready.

### Schema scaffold

The `listings` table already includes `grade`, `grade_source`, and `graded_at` columns. These are null on all v1 listings.

### Upload scaffold

Photo uploads to `listings-photos/{listing_id}/` are already the permanent home for grading inputs. The AI service reads from the same bucket — no migration needed.

### API scaffold

```
POST /api/grading/callback
Body: { listing_id: string, grade: string, source: "ai" }
Auth: service-level API key (not Supabase session)

Handler:
  1. Validate API key (env var GRADING_API_KEY)
  2. Update listings SET grade = $grade, grade_source = 'ai', graded_at = now()
     WHERE id = $listing_id
  3. Return 200
```

This endpoint is deployed from day one as a no-op stub that logs and returns 200. When the AI service is ready, it activates without any schema or infrastructure changes.

### UI scaffold

The vehicle detail page renders a `<GradeDisplay grade={listing.grade} />` component. When `grade` is null it shows a "Grade pending" badge. When populated it shows the grade value. No conditional rendering logic in page code — all contained in the component.

---

## Data Flow

### Listing Creation Flow

```
Wholesaler browser
  → Upload photos (direct to Supabase Storage via signed upload URL)
  → Submit listing form (Server Action)
      → Insert listings row (draft)
      → Insert listing_photos rows with storage_keys
      → Insert listing_documents rows with storage_keys
  → Admin reviews + publishes
      → UPDATE listings SET status = 'active', published_at = now()
```

### Purchase Flow

```
Consumer browser
  → GET /browse/[slug]   (listing detail, public)
  → POST /api/checkout   (Server Route Handler, creates Stripe Checkout Session)
  → Redirect to Stripe Checkout (hosted)
  → Stripe payment completed
  → Stripe → POST /api/stripe/webhook (checkout.session.completed)
      → Verify Stripe signature
      → INSERT orders (status: 'paid')
      → UPDATE listings SET status = 'sold'
      → Trigger document generation (purchase agreement, title transfer)
          → INSERT order_documents (status: 'pending')
          → Queue/inline: generate PDF → upload to order-documents/{order_id}/
          → UPDATE order_documents SET storage_key, status = 'sent'
          → Trigger e-sign flow → UPDATE order_documents SET esign_ref
  → Consumer → GET /checkout/success (polls or subscribes for document status)
  → E-sign callback → POST (internal) → UPDATE order_documents SET signed_at, status = 'signed'
  → All docs signed → UPDATE orders SET status = 'complete'
```

### Admin Data Flow

```
Admin
  → /admin/users        → Supabase SELECT profiles + auth.users (service_role)
  → Create wholesaler   → INSERT profiles with role = 'wholesaler'
                        → Supabase Auth admin.createUser (service_role)
  → /admin/orders       → SELECT orders JOIN listings JOIN profiles
  → Refund order        → Stripe refund API → Webhook → UPDATE orders status = 'refunded'
```

---

## Suggested Build Order (Phase Dependencies)

Components have hard dependencies that dictate build sequence.

```
1. Auth + Role System
   Dependency of: everything else
   Deliverable: Supabase auth, profiles table, role-based middleware

2. Supabase Schema + Storage Buckets
   Dependency of: listings, orders, documents, grading scaffold
   Deliverable: all tables created with RLS, buckets created

3. Wholesaler Listing Management
   Dependency of: Auth, Schema, Storage
   Deliverable: seller portal CRUD, photo upload, document upload

4. Public Storefront (browse + detail)
   Dependency of: listings data exists
   Deliverable: browse page, vehicle detail, search/filter

5. Stripe Checkout + Webhook
   Dependency of: listings, orders table, auth
   Deliverable: checkout flow, webhook order creation

6. Document Generation + E-Sign
   Dependency of: orders exist (post-payment webhook)
   Deliverable: PDF generation, e-sign integration, signing status

7. Admin Panel
   Dependency of: all above (needs real data to manage)
   Deliverable: user management, listing moderation, order management, analytics

8. Grading Scaffold Activation
   Dependency of: photos already uploading to correct bucket (from step 3)
   Deliverable: /api/grading/callback live, GradeDisplay component, grade UI
```

**Why this order:**
- Auth must come first — no protected routes work without it.
- Schema before features — no feature can be built without its tables.
- Listing management before storefront — storefront has nothing to show without listings.
- Checkout before documents — order record must exist before documents are generated.
- Admin last — admin manages real data; it is the least blocked but most meaningful with real data behind it.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-side payment intent creation
**What:** Creating Stripe Checkout Sessions or Payment Intents in client-side code using the secret key.
**Why bad:** Exposes Stripe secret key. All Stripe secret-key operations must be in Server Actions or Route Handlers.
**Instead:** Route Handler at `/api/checkout` creates the session; client redirects to the returned `url`.

### Anti-Pattern 2: Trust redirect URL for payment confirmation
**What:** Marking an order as paid when the consumer lands on `/checkout/success`.
**Why bad:** The URL can be hit without payment (manual navigation, replay attacks).
**Instead:** Only the Stripe webhook `checkout.session.completed` event — with verified signature — creates the order record.

### Anti-Pattern 3: Storing full signed URLs in the database
**What:** Saving `https://[project].supabase.co/storage/v1/object/sign/...` in `storage_key`.
**Why bad:** Signed URLs expire. Project URL changes break everything.
**Instead:** Store the bucket-relative path (e.g., `listings-photos/abc123/photo-001.webp`), generate signed URLs on demand.

### Anti-Pattern 4: Bypassing RLS with anon key in Server Actions
**What:** Using the anon key in server-side code for admin/mutation operations.
**Why bad:** RLS policies on anon key may be permissive for reads; mutations for sensitive tables should use service_role with explicit WHERE clauses.
**Instead:** Create a server-only Supabase client with service_role key for admin operations. Keep anon client for public reads.

### Anti-Pattern 5: Single `role` column on `auth.users` metadata
**What:** Storing role in `auth.users.user_metadata` and reading it client-side.
**Why bad:** Client can tamper with user_metadata on their own account. JWT claims from `auth.users.raw_app_meta_data` are set server-side only and are tamper-proof in RLS policies.
**Instead:** Store role in `profiles.role` (RLS-protected, mutated only via service_role) and use Supabase's custom claims or check `profiles` in RLS policies.

---

## Scalability Considerations

| Concern | At launch (~100 listings) | At scale (~10K listings) |
|---------|--------------------------|--------------------------|
| Listing search | Supabase full-text search (tsvector) sufficient | Add pgvector or Typesense for semantic/faceted search |
| Photo storage | Supabase Storage direct | Supabase Storage + Vercel Image Optimization (already built in) |
| Order volume | Single Postgres DB fine | Partitioning by date if millions of rows |
| Webhook reliability | Synchronous handler in Route Handler | Move to background queue (e.g., Trigger.dev) if timeouts occur |
| Document generation | Inline PDF generation | Offload to background job service |

---

## Sources

All findings are from training data (cutoff August 2025) due to tool restrictions in this session.

- Next.js App Router documentation (route groups, layouts, Server Actions) — HIGH confidence, stable since Next.js 13.4
- Supabase documentation (auth, RLS, storage, service_role patterns) — MEDIUM confidence, patterns are stable but specific API surface should be verified against current docs
- Stripe Checkout + webhook patterns — MEDIUM confidence, core pattern unchanged for years but Connect specifics should be re-verified before implementing
- Schema design — project-specific design, not sourced from a reference implementation
