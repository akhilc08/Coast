# Seller Ratings Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow buyers with completed orders to leave star ratings and reviews for sellers, with seller reply support, visible on listing pages and a new seller profile page.

**Architecture:** A single `reviews` table stores all review data including the seller reply inline. Two Postgres views (`seller_review_stats`, `public_seller_profiles`) serve aggregate stats and safe seller profile data. Server Actions handle all mutations; UI is purely Server Components with one client-side form component each for review submission and seller reply.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS), React Server Actions, TypeScript, Zod, Tailwind CSS, Vitest (unit tests for pure functions only — no DB mocking per project policy). Pagination uses plain Next.js `searchParams` (simpler than nuqs for a single `page` param on a Server Component page).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/009_reviews.sql` | Create | reviews table, views, RLS, GRANTs |
| `lib/validations/review.ts` | Create | Zod schemas and TypeScript types |
| `lib/utils/formatBuyerName.ts` | Create | Pure fn: first name + last initial |
| `lib/queries/reviews.ts` | Create | Server-side DB queries |
| `app/actions/reviews.ts` | Create | submitReview, submitSellerReply |
| `components/reviews/StarRating.tsx` | Create | Read-only star display |
| `components/reviews/StarPicker.tsx` | Create | Interactive star input (client) |
| `components/reviews/ReviewCard.tsx` | Create | Single review + reply display |
| `components/reviews/ReviewForm.tsx` | Create | Leave-a-review form (client) |
| `components/reviews/SellerReplyForm.tsx` | Create | Seller reply form (client) |
| `components/reviews/SellerRatingBadge.tsx` | Create | Compact ★ avg · count badge |
| `app/(public)/sellers/[id]/page.tsx` | Create | Seller profile page |
| `app/(public)/listings/[id]/page.tsx` | Modify | Add SellerRatingBadge |
| `app/(public)/account/orders/[orderId]/page.tsx` | Modify | Add review form / read-only section |
| `tests/lib/utils/formatBuyerName.test.ts` | Create | Unit tests for name formatter |
| `tests/lib/validations/review.test.ts` | Create | Unit tests for Zod schemas |

---

## Chunk 1: Data Layer

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/009_reviews.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/009_reviews.sql

-- ─── reviews table ──────────────────────────────────────────────────────────

CREATE TABLE public.reviews (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid        UNIQUE NOT NULL REFERENCES public.orders(id),
  buyer_id      uuid        NOT NULL REFERENCES public.profiles(id),
  seller_id     uuid        NOT NULL REFERENCES public.profiles(id),
  listing_id    uuid        NOT NULL REFERENCES public.listings(id),
  rating        smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          text        NOT NULL,
  seller_reply  text,
  replied_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((seller_reply IS NULL) = (replied_at IS NULL))
);

-- order_id FK defaults to RESTRICT (intentional: orders with reviews cannot be deleted)

CREATE INDEX idx_reviews_seller_id  ON public.reviews (seller_id);
CREATE INDEX idx_reviews_buyer_id   ON public.reviews (buyer_id);
CREATE INDEX idx_reviews_listing_id ON public.reviews (listing_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "reviews_public_select"
  ON public.reviews FOR SELECT
  USING (true);

-- Buyers with completed orders can insert
-- Note: consumer/wholesaler/admin are profiles.role values, NOT Postgres roles.
-- The only Postgres roles are anon and authenticated.
CREATE POLICY "reviews_consumer_insert"
  ON public.reviews FOR INSERT
  WITH CHECK (
    NEW.buyer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = NEW.order_id
        AND buyer_id = auth.uid()
        AND status = 'complete'
    )
  );

-- Sellers can add a reply (once) to their own reviews
-- Row predicate only — column restriction handled by GRANT below
CREATE POLICY "reviews_seller_update_reply"
  ON public.reviews FOR UPDATE
  USING (seller_id = auth.uid() AND seller_reply IS NULL)
  WITH CHECK (seller_id = auth.uid());

-- Admins full access
-- Uses get_my_role() which reads from app_metadata — same pattern as all other tables in 002_schema.sql
CREATE POLICY "reviews_admin_all"
  ON public.reviews FOR ALL
  USING (public.get_my_role() = 'admin');

-- Column-level GRANTs: sellers can only update reply columns
-- anon/authenticated: Note consumer UIDs won't match seller_id so row policy blocks them anyway
REVOKE UPDATE ON public.reviews FROM authenticated;
GRANT UPDATE (seller_reply, replied_at) ON public.reviews TO authenticated;

-- ─── seller_review_stats view (server-side only) ────────────────────────────

CREATE VIEW public.seller_review_stats WITH (security_invoker = true) AS
  SELECT
    seller_id,
    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
    COUNT(*)::int                   AS review_count
  FROM public.reviews
  GROUP BY seller_id;

-- Server-side only — explicitly block client access
REVOKE SELECT ON public.seller_review_stats FROM anon, authenticated;

-- ─── public_seller_profiles view (column-restricted, publicly readable) ─────

CREATE VIEW public.public_seller_profiles WITH (security_invoker = true) AS
  SELECT id, full_name, company
  FROM public.profiles
  WHERE role = 'wholesaler';

GRANT SELECT ON public.public_seller_profiles TO anon, authenticated;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applies cleanly, `reviews` table appears in DB.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_reviews.sql
git commit -m "feat: add reviews table, RLS, stats view, and public seller profiles view"
```

---

### Task 2: Zod validations and types

**Files:**
- Create: `lib/validations/review.ts`
- Create: `tests/lib/validations/review.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/validations/review.test.ts
import { describe, it, expect } from 'vitest'
import { submitReviewSchema, submitSellerReplySchema } from '@/lib/validations/review'

describe('submitReviewSchema', () => {
  it('accepts valid input', () => {
    const result = submitReviewSchema.safeParse({
      orderId: '00000000-0000-0000-0000-000000000001',
      rating: 4,
      body: 'Great seller!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects rating below 1', () => {
    const result = submitReviewSchema.safeParse({
      orderId: '00000000-0000-0000-0000-000000000001',
      rating: 0,
      body: 'Great seller!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects rating above 5', () => {
    const result = submitReviewSchema.safeParse({
      orderId: '00000000-0000-0000-0000-000000000001',
      rating: 6,
      body: 'Great seller!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty body', () => {
    const result = submitReviewSchema.safeParse({
      orderId: '00000000-0000-0000-0000-000000000001',
      rating: 3,
      body: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only body', () => {
    const result = submitReviewSchema.safeParse({
      orderId: '00000000-0000-0000-0000-000000000001',
      rating: 3,
      body: '   ',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-uuid orderId', () => {
    const result = submitReviewSchema.safeParse({
      orderId: 'not-a-uuid',
      rating: 3,
      body: 'Great seller!',
    })
    expect(result.success).toBe(false)
  })
})

describe('submitSellerReplySchema', () => {
  it('accepts valid reply', () => {
    const result = submitSellerReplySchema.safeParse({
      reviewId: '00000000-0000-0000-0000-000000000002',
      body: 'Thank you for the kind words!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty body', () => {
    const result = submitSellerReplySchema.safeParse({
      reviewId: '00000000-0000-0000-0000-000000000002',
      body: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only body', () => {
    const result = submitSellerReplySchema.safeParse({
      reviewId: '00000000-0000-0000-0000-000000000002',
      body: '   ',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/lib/validations/review.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/validations/review'`

- [ ] **Step 3: Write the validation module**

```typescript
// lib/validations/review.ts
import { z } from 'zod'

export const submitReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating:  z.number().int().min(1).max(5),
  body:    z.string().trim().min(1),
})

export const submitSellerReplySchema = z.object({
  reviewId: z.string().uuid(),
  body:     z.string().trim().min(1),
})

export const reviewSchema = z.object({
  id:           z.string().uuid(),
  order_id:     z.string().uuid(),
  buyer_id:     z.string().uuid(),
  seller_id:    z.string().uuid(),
  listing_id:   z.string().uuid(),
  rating:       z.number().int().min(1).max(5),
  body:         z.string(),
  seller_reply: z.string().nullable(),
  replied_at:   z.string().nullable(),
  created_at:   z.string(),
})

export type SubmitReviewInput      = z.infer<typeof submitReviewSchema>
export type SubmitSellerReplyInput = z.infer<typeof submitSellerReplySchema>
export type Review                 = z.infer<typeof reviewSchema>
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/lib/validations/review.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/validations/review.ts tests/lib/validations/review.test.ts
git commit -m "feat: add review Zod schemas and types"
```

---

### Task 3: formatBuyerName utility

**Files:**
- Create: `lib/utils/formatBuyerName.ts`
- Create: `tests/lib/utils/formatBuyerName.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/utils/formatBuyerName.test.ts
import { describe, it, expect } from 'vitest'
import { formatBuyerName } from '@/lib/utils/formatBuyerName'

describe('formatBuyerName', () => {
  it('returns first name + last initial for a two-word name', () => {
    expect(formatBuyerName('Jane Doe')).toBe('Jane D.')
  })

  it('returns first name + last initial for multi-word name (splits on first space only)', () => {
    expect(formatBuyerName('Mary Jane Watson')).toBe('Mary J.')
  })

  it('returns full trimmed name when there is no space', () => {
    expect(formatBuyerName('Madonna')).toBe('Madonna')
  })

  it('returns Anonymous for null', () => {
    expect(formatBuyerName(null)).toBe('Anonymous')
  })

  it('returns Anonymous for empty string', () => {
    expect(formatBuyerName('')).toBe('Anonymous')
  })

  it('returns Anonymous for whitespace-only string', () => {
    expect(formatBuyerName('   ')).toBe('Anonymous')
  })

  it('handles double spaces between name parts by finding first non-space char after split', () => {
    // "Jane  Doe" — after splitting at first space, remainder is " Doe"
    // last initial = first non-space char in remainder = 'D'
    expect(formatBuyerName('Jane  Doe')).toBe('Jane D.')
  })

  it('trims leading/trailing whitespace before processing', () => {
    expect(formatBuyerName('  Jane Doe  ')).toBe('Jane D.')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/lib/utils/formatBuyerName.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/utils/formatBuyerName'`

- [ ] **Step 3: Implement the utility**

```typescript
// lib/utils/formatBuyerName.ts

/**
 * Derives a privacy-safe display name from a buyer's full_name.
 * Returns "First L." for "First Last", full name if single-word, "Anonymous" if blank/null.
 */
export function formatBuyerName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim() ?? ''
  if (!trimmed) return 'Anonymous'

  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx === -1) return trimmed

  const firstName = trimmed.slice(0, spaceIdx)
  const remainder = trimmed.slice(spaceIdx + 1)
  // Find first non-space character in the remainder for the initial
  const lastInitialChar = remainder.trimStart()[0]
  if (!lastInitialChar) return firstName

  return `${firstName} ${lastInitialChar.toUpperCase()}.`
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/lib/utils/formatBuyerName.test.ts
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/utils/formatBuyerName.ts tests/lib/utils/formatBuyerName.test.ts
git commit -m "feat: add formatBuyerName utility with full test coverage"
```

---

### Task 4: Query functions

**Files:**
- Create: `lib/queries/reviews.ts`

Note: These functions are not unit tested — they require a real database (project policy: no DB mocking).

- [ ] **Step 1: Write the query module**

```typescript
// lib/queries/reviews.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatBuyerName } from '@/lib/utils/formatBuyerName'
import type { Review } from '@/lib/validations/review'

const PAGE_SIZE = 10

export type SellerStats = {
  avg_rating: number
  review_count: number
} | null

export type ReviewWithBuyerName = Review & { buyerDisplayName: string }

export type PublicSellerProfile = {
  id: string
  full_name: string | null
  company: string | null
}

/**
 * Fetches aggregate rating stats for a seller.
 * Returns null if the seller has no reviews.
 * Uses the admin client because seller_review_stats is server-side only (no public GRANT).
 */
export async function getSellerStats(sellerId: string): Promise<SellerStats> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_review_stats')
    .select('avg_rating, review_count')
    .eq('seller_id', sellerId)
    .single()

  if (!data) return null
  return { avg_rating: Number(data.avg_rating), review_count: Number(data.review_count) }
}

/**
 * Fetches one page of reviews for a seller (10 per page, newest first).
 * Uses LIMIT 11 to detect if a next page exists without a COUNT query.
 * Returns reviews with buyer display names resolved via service role.
 */
export async function getReviewsForSeller(
  sellerId: string,
  page: number
): Promise<{ reviews: ReviewWithBuyerName[]; hasNextPage: boolean }> {
  const supabase = await createClient()
  const offset = (page - 1) * PAGE_SIZE

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE) // fetches PAGE_SIZE + 1 rows

  if (error || !data) return { reviews: [], hasNextPage: false }

  const hasNextPage = data.length > PAGE_SIZE
  const pageRows = hasNextPage ? data.slice(0, PAGE_SIZE) : data

  // Fetch buyer names via service role (consumer profiles have no public RLS policy)
  const buyerIds = [...new Set(pageRows.map((r) => r.buyer_id))]
  const admin = createAdminClient()
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', buyerIds)

  const nameMap = new Map((profileRows ?? []).map((p) => [p.id, p.full_name as string | null]))

  const reviews: ReviewWithBuyerName[] = pageRows.map((r) => ({
    ...(r as Review),
    buyerDisplayName: formatBuyerName(nameMap.get(r.buyer_id) ?? null),
  }))

  return { reviews, hasNextPage }
}

/**
 * Fetches the public seller profile (name + company only) from the restricted view.
 * Returns null if the seller doesn't exist or is not a wholesaler.
 */
export async function getPublicSellerProfile(sellerId: string): Promise<PublicSellerProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('public_seller_profiles')
    .select('id, full_name, company')
    .eq('id', sellerId)
    .single()

  return data ?? null
}

/**
 * Fetches the review for a specific order, if one exists.
 */
export async function getReviewForOrder(orderId: string): Promise<Review | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('order_id', orderId)
    .single()

  return (data as Review | null) ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queries/reviews.ts
git commit -m "feat: add review query functions"
```

---

### Task 5: Server Actions

**Files:**
- Create: `app/actions/reviews.ts`

- [ ] **Step 1: Write the server actions**

```typescript
// app/actions/reviews.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { submitReviewSchema, submitSellerReplySchema } from '@/lib/validations/review'

export async function submitReview(
  orderId: string,
  rating: number,
  body: string
): Promise<{ success: true } | { error: string }> {
  // Validate inputs
  const parsed = submitReviewSchema.safeParse({ orderId, rating, body })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== 'consumer') return { error: 'Only buyers can leave reviews' }

  // Fetch the order (user-scoped client — RLS ensures buyer can only see their own orders)
  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, listing_id, status')
    .eq('id', orderId)
    .single()

  if (!order) return { error: 'Order not found' }
  if (order.status !== 'complete') return { error: 'Order is not complete' }

  // Check no existing review for this order
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .single()

  if (existing) return { error: 'Review already submitted for this order' }

  // Insert — RLS double-checks ownership and order status at DB level
  const { error: insertError } = await supabase.from('reviews').insert({
    order_id:   order.id,
    buyer_id:   order.buyer_id,
    seller_id:  order.seller_id,
    listing_id: order.listing_id,
    rating,
    body,
  })

  if (insertError) return { error: insertError.message }

  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath(`/sellers/${order.seller_id}`)
  revalidatePath(`/listings/${order.listing_id}`)

  return { success: true }
}

export async function submitSellerReply(
  reviewId: string,
  body: string
): Promise<{ success: true } | { error: string }> {
  // Validate inputs
  const parsed = submitSellerReplySchema.safeParse({ reviewId, body })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== 'wholesaler') return { error: 'Only sellers can reply to reviews' }

  // Fetch the review
  const { data: review } = await supabase
    .from('reviews')
    .select('id, seller_id, seller_reply')
    .eq('id', reviewId)
    .single()

  if (!review) return { error: 'Review not found' }
  if (review.seller_id !== user.id) return { error: 'Not your review' }
  if (review.seller_reply !== null) return { error: 'Reply already submitted' }

  // Update reply — RLS and column GRANT enforce this at DB level too
  const { error: updateError } = await supabase
    .from('reviews')
    .update({ seller_reply: body, replied_at: new Date().toISOString() })
    .eq('id', reviewId)

  if (updateError) return { error: updateError.message }

  // Revalidate seller profile only — reply doesn't affect aggregate stats
  revalidatePath(`/sellers/${user.id}`)

  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/reviews.ts
git commit -m "feat: add submitReview and submitSellerReply server actions"
```

---

## Chunk 2: UI Components and Pages

### Task 6: StarRating display component

**Files:**
- Create: `components/reviews/StarRating.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/reviews/StarRating.tsx

interface StarRatingProps {
  rating: number  // 1–5
  size?: 'sm' | 'md'
}

export function StarRating({ rating, size = 'md' }: StarRatingProps) {
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={`inline-flex gap-0.5 ${sizeClass}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden className={n <= rating ? 'text-[#ca8a04]' : 'text-[#d6d3d1]'}>
          ★
        </span>
      ))}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reviews/StarRating.tsx
git commit -m "feat: add StarRating display component"
```

---

### Task 7: StarPicker interactive component

**Files:**
- Create: `components/reviews/StarPicker.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/reviews/StarPicker.tsx
'use client'

import { useState } from 'react'

interface StarPickerProps {
  value: number
  onChange: (rating: number) => void
}

export function StarPicker({ value, onChange }: StarPickerProps) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div className="flex gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={value === n}
          className={`text-2xl transition-colors ${n <= active ? 'text-[#ca8a04]' : 'text-[#d6d3d1]'} hover:text-[#ca8a04]`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
        >
          ★
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reviews/StarPicker.tsx
git commit -m "feat: add StarPicker interactive component"
```

---

### Task 8: SellerRatingBadge component

**Files:**
- Create: `components/reviews/SellerRatingBadge.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/reviews/SellerRatingBadge.tsx
import Link from 'next/link'
import type { SellerStats } from '@/lib/queries/reviews'

interface SellerRatingBadgeProps {
  stats: SellerStats
  sellerId: string
}

export function SellerRatingBadge({ stats, sellerId }: SellerRatingBadgeProps) {
  if (!stats) return null

  return (
    <Link
      href={`/sellers/${sellerId}`}
      className="inline-flex items-center gap-1.5 text-sm text-[#57534e] hover:text-[#1c1917] transition-colors"
    >
      <span className="text-[#ca8a04]">★</span>
      <span className="font-medium">{stats.avg_rating}</span>
      <span className="text-[#a8a29e]">·</span>
      <span>{stats.review_count} {stats.review_count === 1 ? 'review' : 'reviews'}</span>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reviews/SellerRatingBadge.tsx
git commit -m "feat: add SellerRatingBadge component"
```

---

### Task 9: ReviewCard component

**Files:**
- Create: `components/reviews/ReviewCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/reviews/ReviewCard.tsx
import { StarRating } from './StarRating'
import { SellerReplyForm } from './SellerReplyForm'
import type { ReviewWithBuyerName } from '@/lib/queries/reviews'

interface ReviewCardProps {
  review: ReviewWithBuyerName
  /** Pass the current seller user ID to show the reply button */
  currentUserId?: string
}

export function ReviewCard({ review, currentUserId }: ReviewCardProps) {
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(review.created_at))

  const isThisSeller = currentUserId === review.seller_id
  const canReply = isThisSeller && review.seller_reply === null

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <StarRating rating={review.rating} />
          <p className="mt-1 text-sm font-medium text-[#1c1917]">{review.buyerDisplayName}</p>
        </div>
        <time className="text-xs text-[#a8a29e] shrink-0">{date}</time>
      </div>

      {/* Body */}
      <p className="text-sm text-[#57534e] leading-relaxed">{review.body}</p>

      {/* Seller reply */}
      {review.seller_reply && (
        <div className="ml-4 border-l-2 border-[#e7e5e4] pl-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Seller Response</p>
          <p className="text-sm text-[#57534e] leading-relaxed">{review.seller_reply}</p>
        </div>
      )}

      {/* Reply form — only for the seller on unreplied reviews */}
      {canReply && (
        <div className="ml-4 border-l-2 border-[#e7e5e4] pl-4">
          <SellerReplyForm reviewId={review.id} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reviews/ReviewCard.tsx
git commit -m "feat: add ReviewCard component with reply display"
```

---

### Task 10: SellerReplyForm client component

**Files:**
- Create: `components/reviews/SellerReplyForm.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/reviews/SellerReplyForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { submitSellerReply } from '@/app/actions/reviews'

interface SellerReplyFormProps {
  reviewId: string
}

export function SellerReplyForm({ reviewId }: SellerReplyFormProps) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-[#78716c] hover:text-[#1c1917] transition-colors"
      >
        Reply to this review
      </button>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitSellerReply(reviewId, body)
      if ('error' in result) {
        setError(result.error)
      }
      // On success the page revalidates and the reply renders server-side
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Your Response</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your response…"
        rows={3}
        className="w-full rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-3 py-2 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917] resize-none"
        required
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="rounded-lg bg-[#1c1917] px-4 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {isPending ? 'Submitting…' : 'Submit Response'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[#e7e5e4] px-4 py-1.5 text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reviews/SellerReplyForm.tsx
git commit -m "feat: add SellerReplyForm client component"
```

---

### Task 11: ReviewForm client component

**Files:**
- Create: `components/reviews/ReviewForm.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/reviews/ReviewForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { StarPicker } from './StarPicker'
import { submitReview } from '@/app/actions/reviews'

interface ReviewFormProps {
  orderId: string
}

export function ReviewForm({ orderId }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitReview(orderId, rating, body)
      if ('error' in result) {
        setError(result.error)
      }
      // On success the page revalidates and shows the read-only review
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-[#1c1917]">Your Rating</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div>
        <label htmlFor="review-body" className="mb-2 block text-sm font-medium text-[#1c1917]">
          Your Review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="How was your experience with this seller?"
          rows={4}
          className="w-full rounded-lg border border-[#e7e5e4] bg-[#faf9f6] px-3 py-2 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917] resize-none"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending || rating === 0 || !body.trim()}
        className="w-full rounded-xl bg-[#1c1917] py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {isPending ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reviews/ReviewForm.tsx
git commit -m "feat: add ReviewForm client component"
```

---

### Task 12: Seller profile page

**Files:**
- Create: `app/(public)/sellers/[id]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// app/(public)/sellers/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicSellerProfile, getSellerStats, getReviewsForSeller } from '@/lib/queries/reviews'
import { StarRating } from '@/components/reviews/StarRating'
import { ReviewCard } from '@/components/reviews/ReviewCard'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const seller = await getPublicSellerProfile(id)
  const name = seller?.company ?? seller?.full_name ?? 'Seller'
  return { title: `${name} — Coast` }
}

export default async function SellerProfilePage({ params, searchParams }: Props) {
  const { id } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  const [seller, stats, { reviews, hasNextPage }] = await Promise.all([
    getPublicSellerProfile(id),
    getSellerStats(id),
    getReviewsForSeller(id, page),
  ])

  if (!seller) notFound()

  // Get current user to show seller reply controls
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isSeller = user?.app_metadata?.role === 'wholesaler' && user?.id === id

  const displayName = seller.company ?? seller.full_name ?? 'Seller'

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Seller header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1c1917]">{displayName}</h1>
        {seller.company && seller.full_name && (
          <p className="mt-1 text-sm text-[#78716c]">{seller.full_name}</p>
        )}

        {/* Aggregate rating */}
        <div className="mt-3">
          {stats ? (
            <div className="flex items-center gap-2">
              <StarRating rating={Math.round(stats.avg_rating)} />
              <span className="text-sm font-medium text-[#1c1917]">{stats.avg_rating}</span>
              <span className="text-sm text-[#a8a29e]">
                ({stats.review_count} {stats.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          ) : (
            <p className="text-sm text-[#a8a29e]">No reviews yet</p>
          )}
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-[#a8a29e]">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={isSeller ? user!.id : undefined}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 1 || hasNextPage) && (
        <div className="mt-8 flex justify-between">
          {page > 1 ? (
            <a
              href={`/sellers/${id}?page=${page - 1}`}
              className="text-sm text-[#78716c] hover:text-[#1c1917] transition-colors"
            >
              ← Newer
            </a>
          ) : (
            <span />
          )}
          {hasNextPage && (
            <a
              href={`/sellers/${id}?page=${page + 1}`}
              className="text-sm text-[#78716c] hover:text-[#1c1917] transition-colors"
            >
              Older →
            </a>
          )}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(public)/sellers/[id]/page.tsx
git commit -m "feat: add seller profile page with reviews and pagination"
```

---

### Task 13: Update listing detail page

**Files:**
- Modify: `app/(public)/listings/[id]/page.tsx`

The listing page already has a seller card area. We add the rating badge after the price block. The `getListing()` query returns `seller_id` — we use that to fetch stats.

- [ ] **Step 1: Add the badge to the listing page**

At the top of `app/(public)/listings/[id]/page.tsx`, add two imports after the existing imports:

```typescript
import { getSellerStats } from '@/lib/queries/reviews'
import { SellerRatingBadge } from '@/components/reviews/SellerRatingBadge'
```

After `const canBuy = !!user && role === 'consumer'` and `const isSold = listing.status === 'sold'`, add:

```typescript
  // Fetch seller rating stats (null if seller has no reviews — badge hides itself)
  const sellerStats = listing.seller_id
    ? await getSellerStats(listing.seller_id)
    : null
```

Then inside the JSX, replace the closing `</div>` of the title/price block. Locate this exact string (lines 48–57 in the existing file):

```tsx
          {/* Title and price */}
          <div>
            <h1 className="text-2xl font-bold text-[#1c1917]">
              {listing.year} {listing.make} {listing.model}
            </h1>
            <p className="mt-1 text-3xl font-semibold text-[#1c1917]">
              {listing.price_cents != null
                ? `$${(listing.price_cents / 100).toLocaleString()}`
                : 'Call for price'}
            </p>
          </div>
```

Replace it with:

```tsx
          {/* Title and price */}
          <div>
            <h1 className="text-2xl font-bold text-[#1c1917]">
              {listing.year} {listing.make} {listing.model}
            </h1>
            <p className="mt-1 text-3xl font-semibold text-[#1c1917]">
              {listing.price_cents != null
                ? `$${(listing.price_cents / 100).toLocaleString()}`
                : 'Call for price'}
            </p>
            {/* Seller rating badge — null if seller has no reviews */}
            {sellerStats && listing.seller_id && (
              <div className="mt-2">
                <SellerRatingBadge stats={sellerStats} sellerId={listing.seller_id} />
              </div>
            )}
          </div>
```

- [ ] **Step 2: Verify the listing page type has seller_id**

```bash
grep -n "seller_id" /Users/sickle/Coding/Coast/lib/queries/listings.ts
```

Expected: `seller_id` is included in the select. If not, add it to the query.

- [ ] **Step 3: Commit**

```bash
git add app/(public)/listings/[id]/page.tsx
git commit -m "feat: add seller rating badge to listing detail page"
```

---

### Task 14: Update order detail page

**Files:**
- Modify: `app/(public)/account/orders/[orderId]/page.tsx`

- [ ] **Step 1: Add review section to the order detail page**

Add imports at the top:

```typescript
import { getReviewForOrder } from '@/lib/queries/reviews'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { StarRating } from '@/components/reviews/StarRating'
import { formatBuyerName } from '@/lib/utils/formatBuyerName'
```

After `const hasPendingSignature = ...`, add:

```typescript
  // Fetch existing review for this order (if any)
  const existingReview = typedOrder.status === 'complete'
    ? await getReviewForOrder(orderId)
    : null

  // The buyer sees their own name verbatim (authenticated, viewing own review)
  // user.user_metadata.full_name is the raw stored value; fall back via formatBuyerName
  const buyerFullName = user.user_metadata?.full_name as string | undefined
```

Locate this exact closing block near the end of the JSX (after the `hasPendingSignature` conditional — note: that block is itself conditional, so anchor on the static outer `</div>` that closes `<div className="mt-8 space-y-4">`):

```tsx
      </div>
    </main>
  )
```

Insert the review section **before** that `</div>` (inside the `mt-8 space-y-4` container). The final structure should be:

```tsx
        {/* Review section — only for complete orders */}
        {typedOrder.status === 'complete' && (
          <section className="rounded-xl border border-[#e7e5e4] bg-white p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
              Your Review
            </p>

            {existingReview ? (
              <div className="space-y-2">
                <p className="text-xs text-green-700 font-medium">Thanks for your review!</p>
                <StarRating rating={existingReview.rating} />
                {buyerFullName && (
                  <p className="text-sm font-medium text-[#1c1917]">{buyerFullName}</p>
                )}
                <p className="text-sm text-[#57534e] leading-relaxed">{existingReview.body}</p>
              </div>
            ) : (
              <ReviewForm orderId={orderId} />
            )}
          </section>
        )}
```

- [ ] **Step 2: Commit**

```bash
git add app/(public)/account/orders/[orderId]/page.tsx
git commit -m "feat: add review form to order detail page for completed orders"
```

---

### Task 15: Smoke test

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```

Expected: all tests PASS (formatBuyerName + review schema tests)

- [ ] **Step 2: Start the dev server and manually verify**

```bash
npm run dev
```

Verify these paths work without errors:
- `/sellers/[any-wholesaler-id]` — loads without 500 (shows "No reviews yet" if no reviews)
- `/listings/[id]` — loads, no badge if seller has no reviews
- `/account/orders/[orderId]` — for a `complete` order, shows the review form

- [ ] **Step 3: Final commit if any cleanup was needed**

```bash
git add -p
git commit -m "fix: address any issues found during smoke test"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | DB migration (table, RLS, views, GRANTs) |
| 2 | Zod schemas + tests |
| 3 | formatBuyerName utility + tests |
| 4 | Query functions (getSellerStats, getReviewsForSeller, etc.) |
| 5 | Server actions (submitReview, submitSellerReply) |
| 6 | StarRating display |
| 7 | StarPicker interactive |
| 8 | SellerRatingBadge |
| 9 | ReviewCard |
| 10 | SellerReplyForm (client) |
| 11 | ReviewForm (client) |
| 12 | /sellers/[id] page |
| 13 | Update /listings/[id] |
| 14 | Update /account/orders/[orderId] |
| 15 | Smoke test |
