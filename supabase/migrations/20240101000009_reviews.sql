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
    buyer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id
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
