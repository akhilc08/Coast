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
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

**Indexes:**
- `seller_id` — for profile page and aggregate queries
- `buyer_id` — for order-level lookup
- `listing_id` — for listing page queries

**Unique constraint:** `order_id` — enforces one review per order at the database level.

### RLS Policies

| Operation | Who | Condition |
|-----------|-----|-----------|
| SELECT | Public | Always |
| INSERT | Consumer | `order_id` belongs to current user, order status = `complete`, no existing review for that order |
| UPDATE (body, rating) | Consumer | Own review (`buyer_id = auth.uid()`) |
| UPDATE (seller_reply, replied_at) | Wholesaler | Own seller review (`seller_id = auth.uid()`), `seller_reply IS NULL` |
| ALL | Admin | Always |

### New view: `seller_review_stats`

```sql
CREATE VIEW seller_review_stats AS
  SELECT
    seller_id,
    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
    COUNT(*)                        AS review_count
  FROM reviews
  GROUP BY seller_id;
```

Used to populate the rating badge on listing pages without a full table scan per page load.

---

## Pages & Components

### New page: `/sellers/[id]`

Public seller profile page.

**Content:**
- Seller name, company
- Aggregate rating badge: ★ 4.3 · 12 reviews (from `seller_review_stats`)
- Paginated list of reviews (newest first), each card showing:
  - Star rating
  - Review body
  - Date
  - Buyer display name (first name + last initial)
  - Seller reply (if present), shown indented below the review

**Seller-specific UI (authenticated, role = wholesaler, seller_id matches):**
- "Reply" button on reviews where `seller_reply IS NULL`
- Inline reply form on click; submits via `submitSellerReply` server action

### Updated page: `/listings/[id]`

Augment the existing seller card with a rating summary badge (avg stars + count) linking to `/sellers/[seller_id]`. No full review list on this page.

### Updated page: `/account/orders/[orderId]`

When order status = `complete` and no review exists for the order:
- Render a "Leave a Review" form: star picker (1–5) + textarea + submit button

When a review already exists for the order:
- Render the review read-only with a thank-you note

---

## Server Actions

### `submitReview(orderId, rating, body)`

Located in `app/actions/reviews.ts`.

1. Get current user — reject if unauthenticated or role ≠ `consumer`
2. Fetch order by `orderId` — reject if not found or `buyer_id ≠ current user`
3. Reject if order `status ≠ 'complete'`
4. Reject if a review already exists for `order_id`
5. Insert review with `buyer_id`, `seller_id`, `listing_id` copied from the order/listing
6. Revalidate `/account/orders/[orderId]` and `/sellers/[seller_id]`

### `submitSellerReply(reviewId, body)`

Located in `app/actions/reviews.ts`.

1. Get current user — reject if unauthenticated or role ≠ `wholesaler`
2. Fetch review by `reviewId` — reject if not found or `seller_id ≠ current user`
3. Reject if `seller_reply IS NOT NULL` (reply already exists)
4. Update `seller_reply` and `replied_at = now()`
5. Revalidate `/sellers/[seller_id]`

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

---

## Out of Scope

- Email notifications on review or reply (can be added later via Resend)
- Admin moderation queue
- Review editing after submission (buyers cannot edit)
- Upvoting/helpfulness scoring
- Photo attachments to reviews
