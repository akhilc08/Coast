# Domain Pitfalls

**Domain:** Wholesale car marketplace (Next.js + Supabase + Stripe + e-signing)
**Researched:** 2026-03-09
**Note:** WebSearch and WebFetch were unavailable during this research session. Findings are drawn from training knowledge of these specific, well-documented technology domains. Confidence levels are assigned per-area.

---

## Critical Pitfalls

Mistakes that cause rewrites, data exposure, or major production incidents.

---

### Pitfall 1: Supabase RLS — Policies That Pass in Tests but Expose Data in Production

**What goes wrong:** RLS policies are written using `auth.uid()` comparisons but the `anon` role is never explicitly blocked from tables that should be private. Supabase enables RLS per table, but if a table has RLS enabled with zero policies, ALL access is denied — but if RLS is disabled (the default for new tables), ALL rows are readable by anyone with the service role key leaked via a client. Developers frequently mistake "I enabled RLS" for "the table is secure."

**Why it happens:** Supabase's default for new tables is RLS disabled. A developer enables RLS, writes a SELECT policy for authenticated users, and never tests as the `anon` role. The `anon` role gets implicit access to any table where a SELECT policy doesn't explicitly exclude it. Additionally, many developers write policies using `auth.uid() = user_id` on the `vehicles` table but forget that the `profiles` or `orders` table used in a JOIN leaks data through the JOIN even if the joined table has a policy.

**Consequences:**
- Consumer-visible wholesale partner contact details (phone, email, business name) exposed via unauthenticated API calls
- Order history of all consumers readable by any logged-in user
- Internal pricing, cost basis, or margin data on vehicle records readable by consumers

**Prevention:**
- Start every new table with RLS enabled immediately in the migration that creates it — never leave it disabled
- Write policies for ALL four operations (SELECT, INSERT, UPDATE, DELETE) even if most are `USING (false)` (deny all)
- Create a dedicated `service_role` bypass only on the server-side API routes that need it; never expose the service role key to the client
- Test policies by running queries authenticated as each role: `anon`, `authenticated` (consumer), and your custom `wholesaler` role
- For multi-role systems, store role in a `profiles` table and use a helper function: `CREATE FUNCTION get_user_role() RETURNS text AS $$ SELECT role FROM profiles WHERE id = auth.uid() $$ LANGUAGE sql SECURITY DEFINER;` — call it from policies to avoid per-policy joins
- Use Supabase's built-in "Table Editor" policy test panel during development

**Detection (warning signs):**
- A `curl` to your Supabase REST API without an Authorization header returns vehicle or order rows
- Any table created without an explicit migration comment `-- RLS: enabled, policies: [list]`
- Unit tests that only use the `service_role` key (they skip RLS entirely)

**Phase mapping:** Address in Phase 1 (Auth + DB schema). Every table migration must include RLS policies. Never defer.

---

### Pitfall 2: Supabase RLS — Custom Claims / Role Confusion Between JWT and DB

**What goes wrong:** The project has three roles: admin, wholesaler, consumer. Developers try to use Supabase's built-in JWT `role` claim for this, but Supabase's JWT `role` field refers to the PostgreSQL role (`anon` or `authenticated`), not the application-level role. Developers who set `role: 'wholesaler'` in user metadata and then write `auth.jwt() ->> 'role' = 'wholesaler'` in RLS policies find that the claim is never present or always returns `authenticated`.

**Why it happens:** Supabase's JWT contains `app_metadata` and `user_metadata`. Supabase Auth sets `role` in the JWT to `anon` or `authenticated` (the Postgres role). Application roles must live in `app_metadata` (server-set) or `user_metadata` (client-settable — not secure for role). The distinction is poorly documented in older Supabase docs and frequently misunderstood.

**Consequences:**
- Wholesalers get consumer-level permissions (can't upload cars)
- Broken RLS policies that silently fail open or fail closed
- Admin panel accessible to non-admins if the check is on `user_metadata` which users can self-modify

**Prevention:**
- Store application roles in a `profiles` table in the database, set by a server-side trigger on user creation
- For admin, store in `auth.users.app_metadata` via the Admin API (Supabase service role only) — this field is not user-editable
- Use a `SECURITY DEFINER` function to look up role from the `profiles` table in RLS policies
- Never use `user_metadata` for role checks — users can self-modify this via the client SDK
- Document the role architecture before writing any policies: which field, which table, which JWT claim, per role

**Detection (warning signs):**
- RLS policies referencing `auth.jwt() ->> 'role'` for application-level roles
- Role-check functions that are not `SECURITY DEFINER`
- User metadata being set from the client SDK for anything security-relevant

**Phase mapping:** Address in Phase 1 (Auth architecture). Define role storage before any tables or policies are written.

---

### Pitfall 3: Stripe — Fulfilling Orders on Checkout Redirect Instead of Webhook

**What goes wrong:** After a successful Stripe Checkout session, Stripe redirects the user to your `success_url`. Developers process the order (mark as paid, trigger document generation, etc.) in the handler for the `success_url` page load rather than in a Stripe webhook handler. This creates a race condition and reliability problem.

**Why it happens:** The redirect to `success_url` is the most visible signal of payment completion. It feels like the right place to confirm. The webhook approach requires a separate endpoint and infrastructure, so developers skip it for speed.

**Consequences:**
- If the user closes the browser tab before the redirect lands, the order is never fulfilled
- If your fulfillment server errors on the redirect handler, the user has been charged but gets no order
- Stripe can call your webhook multiple times (retry on failure) — if you fulfill on redirect, you can't handle retries safely
- Users who open `success_url` directly (bookmarked or shared) can trigger duplicate fulfillment

**Prevention:**
- NEVER fulfill on `success_url` page load — the page should only show "processing, check your email"
- Fulfill ONLY in the `checkout.session.completed` webhook handler
- Make the webhook handler idempotent: check if `stripe_session_id` already exists in your `orders` table before processing
- Store Stripe's `checkout.session.id` on the order record at checkout creation time, then use it to match the webhook event
- Use Stripe's webhook signature verification (`stripe.webhooks.constructEvent`) on every incoming webhook

**Detection (warning signs):**
- Order fulfillment logic in a Next.js page or API route that reads `?session_id=` from the URL
- No `checkout.session.completed` webhook handler exists
- `orders` table has no `stripe_session_id` column or no unique constraint on it

**Phase mapping:** Address in Phase 2 (Payments). Webhook handler must be built and tested before any live payment flow.

---

### Pitfall 4: Stripe — Missing Handling for Payment Method Failures and Partial Auth

**What goes wrong:** The payment flow is built for the happy path only. Card declines, insufficient funds, 3DS authentication failures, and Stripe Radar fraud blocks are not handled, leaving users stranded at a broken state with no clear recovery path.

**Why it happens:** Stripe Checkout handles a lot of this internally, but developers assume `checkout.session.completed` covers all terminal states. It does not — `checkout.session.expired` and `payment_intent.payment_failed` are separate events.

**Consequences:**
- User's cart/intent is in limbo — car is soft-reserved but never released back to available
- No user communication about why checkout failed
- Car remains marked as "in transaction" and unavailable to other buyers indefinitely

**Prevention:**
- Handle `checkout.session.expired` webhook: release any soft-reservation on the vehicle, notify the user
- Handle `payment_intent.payment_failed`: surface a specific error message (card declined vs. fraud block vs. expired card)
- Implement a vehicle reservation timeout: if a checkout session is created but no `completed` event arrives within N minutes, release the reservation via a scheduled Supabase Edge Function or cron job
- Test all failure scenarios using Stripe's test card numbers (e.g., `4000000000000002` for decline)

**Detection (warning signs):**
- Only `checkout.session.completed` is handled in the webhook router
- No vehicle "status" field that can be set to `reserved`, `sold`, `available`
- No timeout/expiry mechanism for pending checkouts

**Phase mapping:** Address in Phase 2 (Payments). Build the full webhook event matrix, not just the happy path.

---

### Pitfall 5: E-Signing — Treating Document Generation as Synchronous

**What goes wrong:** Document generation (PDF creation, populating purchase agreement with buyer/vehicle data) and the e-signing invitation email are treated as synchronous steps in the purchase completion handler. If the PDF library times out, the e-signing API rate-limits the request, or the third-party service has downtime, the entire purchase completion request fails.

**Why it happens:** Document generation feels like a simple step in a sequence. Developers chain it directly: payment confirmed → generate PDF → send for signing → mark order complete.

**Consequences:**
- User gets an error on the "purchase complete" page even though Stripe successfully charged them
- Order is in an indeterminate state (paid but no documents)
- Manual admin intervention required for every failure, which doesn't scale

**Prevention:**
- Queue document generation and e-sign invitation as a background job triggered by the webhook, not inline in the webhook handler response
- Use Supabase Edge Functions with a job queue pattern, or a simple `document_jobs` table polled by a cron Edge Function
- The webhook handler responds to Stripe within 5 seconds (Stripe's timeout) and enqueues the work
- Build an admin UI panel that shows orders stuck in `documents_pending` state so manual retry is easy
- Implement retry logic with exponential backoff for e-signing API calls

**Detection (warning signs):**
- Document generation inside the Stripe webhook handler (same request/response cycle)
- No `document_status` field on the orders table (`pending`, `generated`, `sent`, `signed`, `completed`)
- No admin view of document generation failures

**Phase mapping:** Address in Phase 3 (Documents / E-signing). Design the async job pattern before implementing the document generation logic.

---

### Pitfall 6: E-Signing — Webhook vs. Polling for Signature Completion

**What goes wrong:** The e-signing provider (DocuSign, HelloSign/Dropbox Sign, SignNow, etc.) notifies your system when all parties have signed. Developers poll the provider's API on a timer to check signature status rather than implementing the provider's webhook. This creates delays, burns API quota, and breaks under load.

**Why it happens:** Webhooks require a publicly accessible endpoint and event verification, which feels like more setup. Polling seems simpler during development with localhost.

**Consequences:**
- Orders that complete signing at 2am are not marked complete until the next poll cycle (potentially hours)
- API rate limits are hit if many orders are in-flight simultaneously
- Title transfer cannot be triggered promptly after signing

**Prevention:**
- Implement the e-signing provider's webhook/callback on day one — design the endpoint before building the polling fallback
- Use a polling fallback ONLY for recovery (orders older than 24 hours that the webhook may have missed)
- Store the provider's envelope/document ID on the order record to correlate webhook events
- Verify webhook signatures from the e-signing provider (most providers sign their callbacks)

**Detection (warning signs):**
- A cron job or `setInterval` that calls the e-signing API to check status
- No `signing_envelope_id` column on orders table
- E-signing provider webhook URL not configured in provider dashboard

**Phase mapping:** Address in Phase 3 (Documents). Webhook-first from the start.

---

## Moderate Pitfalls

Mistakes that create meaningful rework or UX degradation but not data exposure.

---

### Pitfall 7: Image Handling — Uploading Full-Resolution Photos Without Processing Pipeline

**What goes wrong:** Wholesaler uploads raw camera photos (5-15MB JPEG, 4000x3000px) directly to Supabase Storage. These are served directly to consumers in `<img>` tags. The listing page takes 30+ seconds to load because it loads 10-20 unprocessed photos.

**Why it happens:** Supabase Storage accepts any file. There is no built-in image processing pipeline. The simplest implementation is direct upload → direct serve, which works in development where images are small.

**Consequences:**
- Listing pages are unusably slow on mobile
- Supabase Storage egress costs spike at scale (serving 10MB files vs. 200KB)
- Core Web Vitals (LCP) fail, hurting SEO
- Car grading system receives unprocessed images — no consistent format for future AI ingestion

**Prevention:**
- Process images on upload: resize to web dimensions (max 1920px wide), convert to WebP, generate thumbnail (400px wide)
- Use a Supabase Edge Function triggered on storage upload to call an image processing service (Cloudflare Images, imgix, or a self-hosted Sharp worker on a small Fly.io instance)
- Alternatively: upload client-side with browser-based compression before sending to storage (use `browser-image-compression` npm package) — simpler for v1, less powerful
- Store three variants per photo: `original` (kept for AI grading), `web` (WebP 1200px), `thumb` (WebP 400px)
- Never serve `original` URLs to consumers — serve `web` and `thumb` variants only
- Use Next.js `<Image>` component with Supabase storage URL configured as a remote pattern

**Detection (warning signs):**
- Supabase storage bucket contains `.jpg` or `.heic` files over 2MB
- Listing page `<img>` src attributes point directly to Supabase storage URLs without transformation parameters
- No image variant columns in the `vehicle_photos` table

**Phase mapping:** Address in Phase 1 (Listings / Photo upload). Processing pipeline must be designed before the first wholesaler uploads a real vehicle.

---

### Pitfall 8: Search and Filter — N+1 Queries and Missing Indexes on Filter Columns

**What goes wrong:** The browse/search page issues a Supabase query with multiple filter conditions (make, model, year range, price range, mileage range) and the query becomes slow as inventory grows because filter columns are unindexed. Additionally, each listing card fetches a cover photo via a separate query (N+1).

**Why it happens:** Supabase's auto-generated REST API handles basic filtering. In development with 20 test vehicles, performance seems fine. In production with 500+ listings, unindexed columns cause sequential table scans.

**Consequences:**
- Browse page takes 3-8 seconds to load with real inventory
- Filtering by make/model/year feels broken (slow or returning stale results)
- Server load spikes under concurrent user traffic

**Prevention:**
- Add composite indexes on the most common filter combinations at schema creation time: `(make, model, year)`, `(price)`, `(status)`, `(created_at DESC)`
- Use PostgreSQL full-text search (`tsvector`) for keyword search across make, model, VIN, condition notes — do not use `ILIKE '%term%'` (no index)
- Fetch cover photo in the same query using a Postgres view or a `LEFT JOIN LATERAL` that selects the first photo — do not make N separate photo requests
- Paginate with cursor-based pagination (`WHERE created_at < :cursor ORDER BY created_at DESC LIMIT 20`), not offset pagination which degrades at high offsets
- Add a `status` column with an index — filter out `sold` and `reserved` vehicles efficiently

**Detection (warning signs):**
- Vehicle listing queries using `ILIKE '%term%'` for search
- No migration files containing `CREATE INDEX` statements
- Vehicle listing page makes one API call per vehicle to fetch the photo
- Pagination implemented with `?page=5&limit=20` (offset-based)

**Phase mapping:** Address in Phase 1 (Listings / Browse). Schema and indexes must be correct from the first migration. Adding indexes to a production table with live data causes lock issues.

---

### Pitfall 9: Vehicle Status State Machine — No Atomic Reservation

**What goes wrong:** Two consumers click "Buy Now" on the same vehicle simultaneously. Both proceed through Stripe Checkout. Both receive `checkout.session.completed` webhooks. The first one to complete marks the vehicle as sold; the second one has been charged for a car that's no longer available.

**Why it happens:** There is no atomic reservation step before Stripe Checkout is created. The happy path is built assuming only one buyer at a time.

**Consequences:**
- Duplicate sales: two buyers charged for one vehicle (catastrophic trust/legal problem)
- Manual refund required, angry customer, potential chargeback

**Prevention:**
- Use a PostgreSQL advisory lock or `SELECT ... FOR UPDATE SKIP LOCKED` when creating a checkout session: update the vehicle status to `reserved` atomically before creating the Stripe session — if the row is already reserved, return an error to the second buyer
- Implement the reservation in a Supabase database function (RPC) to ensure atomicity:
  ```sql
  CREATE FUNCTION reserve_vehicle(vehicle_id uuid, session_id text)
  RETURNS boolean AS $$
  BEGIN
    UPDATE vehicles
    SET status = 'reserved', stripe_session_id = session_id
    WHERE id = vehicle_id AND status = 'available';
    RETURN FOUND;
  END;
  $$ LANGUAGE plpgsql;
  ```
- If `FOUND` is false, the vehicle was already reserved — abort and show the buyer an "unavailable" message
- Release reservation on `checkout.session.expired` or after a timeout (15-30 minutes)

**Detection (warning signs):**
- Vehicle status is only updated in the `checkout.session.completed` webhook (after payment, not before)
- No atomic database operation guarding the transition from `available` to `reserved`
- No mechanism to release reservations for abandoned checkouts

**Phase mapping:** Address in Phase 2 (Payments). Must be built before any real vehicle goes live.

---

### Pitfall 10: Admin Role — RLS Bypass Via Service Role Key Exposed to Client

**What goes wrong:** The admin panel needs to read all data regardless of user. Developers expose the Supabase service role key to the browser (in `NEXT_PUBLIC_` env vars or embedded in client JS) to bypass RLS for admin queries.

**Why it happens:** The service role key bypasses all RLS, making admin data fetching trivially simple. It's the path of least resistance.

**Consequences:**
- Service role key visible in browser DevTools → anyone can read/write/delete any data in the database
- Complete data breach: all vehicles, all orders, all user PII, all documents

**Prevention:**
- The service role key MUST ONLY exist in server-side code (Next.js API routes or Server Components/Server Actions)
- Admin operations flow through Next.js API routes that verify admin status server-side before using the service role client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe) vs `SUPABASE_SERVICE_ROLE_KEY` (server-only) — enforce this with ESLint rules if possible
- Admin panel pages use `getServerSideProps` or Server Components that check admin session before issuing privileged queries

**Detection (warning signs):**
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` exists in any `.env` file
- Client-side code imports `createClient` with the service role key
- Admin Supabase client initialized in a file that gets bundled to the browser

**Phase mapping:** Address in Phase 1 (Auth + Admin scaffolding). This must be established in the auth architecture before admin features are built.

---

### Pitfall 11: Document Storage — Mixing Public and Private Buckets

**What goes wrong:** Vehicle photos (public — consumers should see them) and transaction documents (private — Carfax, purchase agreements, title transfers) are stored in the same Supabase storage bucket, or in separate buckets where both are public.

**Why it happens:** It's simpler to create one bucket and upload everything to it. RLS for storage buckets is a separate configuration step from table RLS and is often overlooked.

**Consequences:**
- Carfax reports, purchase agreements, and title documents for all transactions accessible to unauthenticated users via direct URL guessing (UUIDs in storage paths are not secret enough)
- Potential legal exposure: title documents contain sensitive PII

**Prevention:**
- Create two separate buckets from day one: `vehicle-photos` (public) and `transaction-documents` (private)
- Private bucket RLS: only the buyer of the specific order and admin can read documents for that order
- Never put transaction documents in a public bucket, even behind long random filenames
- Storage paths for private documents should include the `order_id` to make policy writing straightforward: `transaction-documents/{order_id}/{filename}`

**Detection (warning signs):**
- Single storage bucket for all uploads
- Supabase storage bucket policy is `public` for all files
- Document URLs are returned directly to the consumer without a signed URL step

**Phase mapping:** Address in Phase 1 (Storage architecture). Define bucket structure before any file upload code is written.

---

## Minor Pitfalls

Mistakes that create friction, rework, or missed opportunities but are correctable.

---

### Pitfall 12: UX — Car Buying Flow with Too Many Steps Before Commitment

**What goes wrong:** The purchase flow requires account creation before the buyer can see price, contact info, or start checkout. Users who are browsing casually are forced to register before they can evaluate whether they want to buy. Conversion drops significantly.

**Prevention:**
- Allow unauthenticated browsing of all listing details including price
- Defer account creation to checkout initiation (Stripe Checkout can collect email; create/link account after payment)
- Show all vehicle information (photos, VIN, Carfax, condition notes) to anonymous visitors — the wholesale partner contact info can be gated post-purchase

**Phase mapping:** Phase 2 (Browse + Purchase UX). Validate the auth gate placement before building.

---

### Pitfall 13: UX — No Clear Vehicle Condition Communication

**What goes wrong:** Wholesalers upload condition notes as free-text blobs. Consumers cannot assess condition at a glance. The car grading system placeholder is left visually invisible or confusing. Buyers abandon listings because condition is unclear.

**Prevention:**
- Even without AI grading, implement a structured condition field: `Excellent / Good / Fair / As-Is` with defined criteria displayed in the UI
- The grading placeholder should show a visible "Grade Pending" badge, not an empty space
- Condition notes should be displayed prominently near photos, not buried at the bottom

**Phase mapping:** Phase 1 (Listings). Structured condition field in the schema from day one, even before AI grading.

---

### Pitfall 14: UX — No Saved Search or Listing Alert Feature

**What goes wrong:** Wholesale inventory turns over quickly. A consumer who doesn't find what they want today has no way to be notified when matching inventory arrives. They leave and don't return.

**Prevention:**
- Scaffold a "notify me when this search has results" email capture during Phase 1 even if the notification send isn't implemented until later
- Store search parameters; send a weekly digest of new matching inventory as a minimum

**Phase mapping:** Phase 2 or later. Low complexity, high retention value. At minimum, capture the data early.

---

### Pitfall 15: Next.js / Vercel — Supabase Realtime Subscriptions in Server Components

**What goes wrong:** Developers attempt to use Supabase Realtime subscriptions (WebSocket-based) inside Next.js Server Components or in API routes. Server Components are stateless and rendered once — they cannot maintain WebSocket connections. The code silently does nothing or errors in production.

**Prevention:**
- Realtime subscriptions must live in Client Components only (`'use client'` directive)
- For admin dashboard live updates (new orders, status changes), use a Client Component wrapper around the dashboard that subscribes to relevant Supabase Realtime channels
- For listing status changes (vehicle goes from available to sold), use SWR or React Query polling as a simpler alternative if Realtime feels complex

**Detection (warning signs):**
- `supabase.channel(...).subscribe()` called in a file without `'use client'`
- Realtime subscription in a `getServerSideProps` or Server Action

**Phase mapping:** Address during any phase that adds real-time UI features (admin dashboard, order status).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| DB Schema / Auth setup | RLS disabled by default on new tables | Enable RLS + deny-all policies in every migration |
| Auth roles (admin/wholesaler/consumer) | JWT `role` field confusion | Store app roles in `profiles` table, not JWT metadata |
| Photo upload (listings) | Raw full-resolution images served to consumers | Image processing pipeline before storage |
| Browse / search | Unindexed filter columns, N+1 photo queries | Composite indexes + cover photo JOIN in schema design |
| Stripe Checkout | Fulfillment on redirect, not webhook | Webhook-only fulfillment, idempotent handler |
| Stripe Checkout | Concurrent buyers, no atomic reservation | Postgres atomic `reserve_vehicle` RPC function |
| Stripe Checkout | Missing failure event handlers | Handle `expired` and `payment_failed` events |
| Document generation | Synchronous in webhook handler | Async job queue, respond to Stripe within 5s |
| E-signing status | Polling instead of webhook | Provider webhook endpoint, polling only as fallback |
| Storage buckets | Documents in public bucket | Separate public/private buckets from day one |
| Admin panel | Service role key exposed to client | Server-only service role key, always |
| Admin panel | Realtime in Server Components | Client Component wrappers for subscriptions |

---

## Sources

- Confidence: HIGH — Supabase RLS and storage bucket architecture (well-documented, stable, tested against official Supabase docs patterns in training data through Aug 2025)
- Confidence: HIGH — Stripe webhook fulfillment patterns (official Stripe best practices, idempotency, event handling — stable across Stripe API versions)
- Confidence: MEDIUM — E-signing integration patterns (general provider patterns; specific API details vary by provider — DocuSign vs. HelloSign vs. SignNow not yet selected)
- Confidence: MEDIUM — Automotive e-commerce UX pitfalls (domain-specific patterns from training; not verified against live competitor analysis due to tool restrictions)
- Confidence: HIGH — Next.js Server/Client Component boundaries with Supabase (React Server Components + Supabase SDK behavior is well-documented)
- Note: WebSearch and WebFetch were denied during this session. All findings are from training knowledge. The Supabase, Stripe, and Next.js findings are well-established and unlikely to have changed materially. E-signing provider selection and specific API details should be validated when the provider is chosen (Phase 3 research).
