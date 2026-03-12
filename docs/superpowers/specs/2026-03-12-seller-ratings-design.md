# Seller Ratings via Customer Reviews

**Date:** 2026-03-12
**Status:** Approved

---

## Overview

Allow buyers who completed a purchase to leave a star rating and written review for the seller. Sellers can post a single public reply per review. Reviews appear as a summary badge on listing detail pages and in full on a new seller profile page.

---

## Requirements

- Only buyers with a completed order (`status = 'complete'`) may leave a review
- One review per completed order (a buyer can review the same seller multiple times across different orders)
- Review consists of: star rating (1–5) + written review body (required)
- Reviews publish immediately — no moderation queue
- Sellers may post one public reply per review
- Reviews are visible publicly on:
  - A new seller profile page (`/sellers/[id]`) — full list
  - The listing detail page (`/listings/[id]`) — aggregate summary badge only

---

## Database Schema

### New table: `reviews`

```sql
CREATE TABLE reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid UNIQUE NOT NULL REFERENCES orders(id),
  buyer_id      uuid NOT NULL REFERENCES profiles(id),
  seller_id     uuid NOT NULL REFERENCES profiles(id),
  listing_id    uuid NOT NULL REFERENCES listings(id),
  rating        smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          text NOT NULL,
  seller_reply  text,
  replied_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((seller_reply IS NULL) = (replied_at IS NULL))
);
```

**Indexes:**
- `seller_id` — for profile page and aggregate queries
- `buyer_id` — for order-level lookup
- `listing_id` — for listing page queries

**Unique constraint:** `order_id` — enforces one review per order at the database level.

**FK cascade behavior:** `order_id` references `orders(id)` with no `ON DELETE` clause, defaulting to `RESTRICT`. This is intentional — an order with a review cannot be deleted at the DB level. Any future order cleanup or cancellation path must account for this.

### RLS Policies

| Operation | Who | Condition |
|-----------|-----|-----------|
| SELECT | Public | Always |
| INSERT | Consumer | Subquery confirms `order_id` references an order where `buyer_id = auth.uid()` AND `status = 'complete'` (see below) |
| UPDATE (seller_reply, replied_at) | Wholesaler | Own seller review (`seller_id = auth.uid()`), `seller_reply IS NULL` |
| ALL | Admin | Always |

> **Note on INSERT RLS:** The INSERT policy must (a) verify `NEW.buyer_id = auth.uid()` to prevent spoofed buyer IDs, and (b) perform a subquery against `orders` to validate both ownership and status. The full condition:
> ```sql
> NEW.buyer_id = auth.uid()
> AND EXISTS (
>   SELECT 1 FROM orders
>   WHERE id = NEW.order_id
>     AND buyer_id = auth.uid()
>     AND status = 'complete'
> )
> ```
> The `UNIQUE` constraint on `order_id` handles duplicate prevention at the DB level.
>
> **Note on INSERT RLS dependency:** The EXISTS subquery runs in the context of the inserting user, relying on the `orders` RLS allowing buyers to read their own orders. If the `orders` SELECT policy is ever tightened, the review INSERT policy may silently break. This dependency should be documented in the `orders` RLS migration comments.
>
> **Note on buyer UPDATE:** Buyers cannot edit reviews after submission (this is out of scope). No UPDATE policy should be granted to consumers — omitting this from RLS is intentional.
>
> **Note on Postgres roles vs app-level roles:** `consumer`, `wholesaler`, and `admin` are values in the `profiles.role` column — they are NOT Postgres database roles. The only Postgres roles in use are `anon` (unauthenticated) and `authenticated` (any logged-in user). RLS policies enforce app-level role checks using `auth.jwt()->>'role'` or a join to `profiles`. `GRANT` statements target `anon` / `authenticated`, never `consumer` or `wholesaler`.
>
> **Note on column-level GRANT to `authenticated`:** Granting `UPDATE (seller_reply, replied_at)` to `authenticated` means any authenticated user (including consumers) has the Postgres privilege to attempt an UPDATE on those columns. However, the row-level predicate (`seller_id = auth.uid()`) ensures that no consumer's UID will ever match a review's `seller_id`, so the RLS policy blocks the attempt before any data is touched. This is acceptable and consistent with how Supabase column GRANTs work in practice.
>
> **Note on seller UPDATE column scope:** PostgreSQL RLS UPDATE policies cannot restrict which columns are updated — that requires column-level GRANTs. The seller UPDATE policy enforces the correct row predicate, but column restriction (`seller_reply`, `replied_at` only) must be enforced via:
> ```sql
> REVOKE UPDATE ON reviews FROM authenticated;
> GRANT UPDATE (seller_reply, replied_at) ON reviews TO authenticated;
> ```
> The `submitSellerReply` server action also enforces this at the application layer as defense-in-depth.

### New view: `seller_review_stats`

```sql
CREATE VIEW seller_review_stats WITH (security_invoker = true) AS
  SELECT
    seller_id,
    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
    COUNT(*)                        AS review_count
  FROM reviews
  GROUP BY seller_id;
```

This view is consumed **server-side only** (in Next.js Server Components and Server Actions). It is not queried directly from the browser client. Explicitly revoke public access to prevent blanket GRANTs (e.g., from a future migration) from accidentally exposing it:

```sql
REVOKE SELECT ON seller_review_stats FROM anon, authenticated;
```

`security_invoker = true` is set as a best-practice default to avoid privilege escalation if the view is ever exposed to the client in the future.

**Zero-review state:** The view returns no row for sellers with zero reviews. All consumers of this view must handle a missing row gracefully. On `/sellers/[id]`, display "No reviews yet" in place of the rating badge. On `/listings/[id]`, omit the rating badge entirely if no row is found.

### New view: `public_seller_profiles`

Rather than adding a public RLS policy to `profiles` (which would expose all columns for wholesalers), create a restricted view that projects only safe fields:

```sql
CREATE VIEW public_seller_profiles WITH (security_invoker = true) AS
  SELECT id, full_name, company
  FROM profiles
  WHERE role = 'wholesaler';

GRANT SELECT ON public_seller_profiles TO anon, authenticated;
```

The `/sellers/[id]` page queries `public_seller_profiles` for seller name and company. This provides column-level protection at the DB layer — `phone` and other wholesaler PII are never exposed publicly, regardless of application code. No changes to `profiles` RLS policies are needed.

### Buyer name lookup on `/sellers/[id]`

Buyer names are derived from `profiles.full_name` for consumer accounts. Consumer profile rows have no public SELECT policy and must not be given one. The `/sellers/[id]` page is a Next.js Server Component — it must use the **service-role Supabase client** (not the user-scoped client) for the buyer name lookup only. The service role bypasses RLS and is only used server-side, so this does not expose consumer data to the browser.

The service-role client should be used narrowly: fetch only `id, full_name` for the buyer IDs present in the current page of reviews, not for all profiles.

---

## Pages & Components

### New page: `/sellers/[id]`

Public seller profile page.

**Content:**
- Seller name, company
- Aggregate rating badge: ★ 4.3 · 12 reviews (from `seller_review_stats`)
- Paginated list of reviews (newest first, 10 per page), each card showing:
  - Star rating
  - Review body
  - Date
  - Buyer display name derived from `profiles.full_name` (a single free-text field). Algorithm: trim whitespace first; if the result is empty or null, display "Anonymous". Otherwise split on the first space: everything before the first space is the first name, the first non-space character after the split point is the last initial. If no space exists after trimming, display the full trimmed name as-is.
  - Seller reply (if present), shown indented below the review

Pagination uses offset-based strategy with URL query state managed via `nuqs` (already a project dependency). Query param: `?page=N` (default 1). The page query fetches 10 reviews plus one extra (`LIMIT 11`) to detect whether a "Next" page exists — if 11 rows are returned, show a "Next" button and render only 10. No separate `COUNT(*)` query is needed. Total count (e.g., "showing X of Y") is not displayed.

**Seller-specific UI (authenticated, role = wholesaler, seller_id matches):**
- "Reply" button on reviews where `seller_reply IS NULL`
- Inline reply form on click; submits via `submitSellerReply` server action

### Updated page: `/listings/[id]`

Augment the existing seller card with a rating summary badge (avg stars + count) linking to `/sellers/[seller_id]`. No full review list on this page.

### Updated page: `/account/orders/[orderId]`

When order status = `complete` and no review exists for the order:
- Render a "Leave a Review" form: star picker (1–5) + textarea + submit button

When a review already exists for the order:
- Render the review read-only with a thank-you note. Display the buyer's own name verbatim (since they are authenticated and viewing their own review — no truncation needed).

---

## Server Actions

### `submitReview(orderId, rating, body)`

Located in `app/actions/reviews.ts`.

**Supabase client:** Use the user-scoped Supabase client (not service role). This means `orders` RLS applies at the fetch step — only the buyer's own orders are returned, providing implicit ownership validation. The explicit `buyer_id ≠ current user` check in step 2 remains as defense-in-depth.

1. Get current user — reject if unauthenticated or role ≠ `consumer`
2. Fetch order by `orderId` using the user-scoped client — reject if not found (RLS will return no row if the buyer doesn't own it)
3. Reject if order `status ≠ 'complete'`
4. Reject if a review already exists for `order_id`
5. Insert review with `buyer_id = order.buyer_id`, `seller_id = order.seller_id`, `listing_id = order.listing_id` — all three are `NOT NULL` columns on `orders` (confirmed from schema)
6. Revalidate `/account/orders/[orderId]`, `/sellers/[seller_id]`, and `/listings/[listing_id]` so the aggregate badge on the listing page reflects the new review

### `submitSellerReply(reviewId, body)`

Located in `app/actions/reviews.ts`.

1. Get current user — reject if unauthenticated or role ≠ `wholesaler`
2. Fetch review by `reviewId` — reject if not found or `seller_id ≠ current user`
3. Reject if `seller_reply IS NOT NULL` (reply already exists)
4. Update `seller_reply` and `replied_at = now()`
5. Revalidate `/sellers/[seller_id]` only — a reply does not affect `avg_rating` or `review_count`, so the listing page badge does not need revalidation

---

## Data Flow

### Review submission

```
Buyer on /account/orders/[orderId]
  → sees "Leave a Review" form (order complete, no existing review)
  → submits rating + body
  → submitReview server action validates + inserts
  → page revalidates → shows review read-only
```

### Seller reply

```
Seller on /sellers/[id]
  → sees "Reply" button on unreplied review
  → submits reply text
  → submitSellerReply validates + updates
  → page revalidates → reply visible inline
```

---

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Buyer reviews incomplete/cancelled order | Blocked at server action + RLS |
| Buyer submits second review for same order | `UNIQUE` constraint on `order_id` rejects insert |
| Seller replies to another seller's review | RLS blocks the update |
| Seller tries to overwrite existing reply | Server action rejects if `seller_reply IS NOT NULL` |
| Unauthenticated user submits review | Server action rejects immediately |
| Seller has zero reviews | `seller_review_stats` returns no row — badge omitted on listing page, "No reviews yet" shown on seller profile |

---

## Out of Scope

- Email notifications on review or reply (can be added later via Resend)
- Admin moderation queue
- Review editing after submission (buyers cannot edit)
- Upvoting/helpfulness scoring
- Photo attachments to reviews
