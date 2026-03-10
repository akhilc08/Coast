-- Migration 002: Core application tables with RLS
-- Apply after 001_profiles_and_hook.sql

-- ============================================================
-- Listings (GRADE-03: includes grade, grade_source, graded_at)
-- ============================================================
CREATE TABLE public.listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES public.profiles(id),
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'sold', 'archived')),
  title           text NOT NULL,
  make            text NOT NULL,
  model           text NOT NULL,
  year            int  NOT NULL,
  mileage         int,
  color           text,
  vin             text UNIQUE,
  price_cents     int  NOT NULL,
  condition_notes text,
  -- GRADE-03: Grading scaffold — null until AI service populates
  grade           text,
  grade_source    text CHECK (grade_source IN ('ai', 'manual') OR grade_source IS NULL),
  graded_at       timestamptz,
  published_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Performance indexes for Phase 2 search/filter (add now — adding to large table later requires lock)
CREATE INDEX idx_listings_status ON public.listings (status);
CREATE INDEX idx_listings_make_model_year ON public.listings (make, model, year);
CREATE INDEX idx_listings_price ON public.listings (price_cents);
CREATE INDEX idx_listings_created_at ON public.listings (created_at DESC);
CREATE INDEX idx_listings_seller_id ON public.listings (seller_id);

-- Public can read active listings (no auth required for browsing)
CREATE POLICY "public_read_active_listings"
ON public.listings FOR SELECT
USING (status = 'active');

-- Wholesalers can read their own listings (any status)
CREATE POLICY "wholesalers_read_own_listings"
ON public.listings FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'wholesaler'
  AND seller_id = auth.uid()
);

-- Wholesalers can create, update, delete their own listings
CREATE POLICY "wholesalers_manage_own_listings"
ON public.listings
FOR ALL
TO authenticated
USING (
  public.get_my_role() = 'wholesaler'
  AND seller_id = auth.uid()
)
WITH CHECK (
  public.get_my_role() = 'wholesaler'
  AND seller_id = auth.uid()
);

-- Admins have full access to all listings
CREATE POLICY "admins_full_access_listings"
ON public.listings
FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin');

-- ============================================================
-- Listing Photos
-- ============================================================
CREATE TABLE public.listing_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_key text NOT NULL,  -- relative path within car-photos bucket, NOT a full URL
  position    int  NOT NULL DEFAULT 0,  -- 0 = hero image
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_listing_photos_listing_id ON public.listing_photos (listing_id, position);

-- Public can read photos for active listings
CREATE POLICY "public_read_listing_photos"
ON public.listing_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = listing_photos.listing_id AND status = 'active'
  )
);

-- Wholesalers manage photos for their own listings
CREATE POLICY "wholesalers_manage_own_listing_photos"
ON public.listing_photos
FOR ALL
TO authenticated
USING (
  public.get_my_role() = 'wholesaler'
  AND EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = listing_photos.listing_id AND seller_id = auth.uid()
  )
)
WITH CHECK (
  public.get_my_role() = 'wholesaler'
  AND EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = listing_photos.listing_id AND seller_id = auth.uid()
  )
);

-- Admins full access
CREATE POLICY "admins_full_access_listing_photos"
ON public.listing_photos FOR ALL TO authenticated
USING (public.get_my_role() = 'admin');

-- ============================================================
-- Listing Documents (Carfax, title, service records)
-- ============================================================
CREATE TABLE public.listing_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  document_type text NOT NULL
                CHECK (document_type IN ('carfax', 'title', 'service_history', 'other')),
  storage_key   text NOT NULL,  -- relative path within car-documents bucket
  file_name     text,
  uploaded_at   timestamptz DEFAULT now()
);

ALTER TABLE public.listing_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_listing_documents_listing_id ON public.listing_documents (listing_id);

-- Wholesalers manage their own listing documents
CREATE POLICY "wholesalers_manage_own_listing_documents"
ON public.listing_documents
FOR ALL
TO authenticated
USING (
  public.get_my_role() = 'wholesaler'
  AND EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = listing_documents.listing_id AND seller_id = auth.uid()
  )
)
WITH CHECK (
  public.get_my_role() = 'wholesaler'
  AND EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = listing_documents.listing_id AND seller_id = auth.uid()
  )
);

-- Authenticated buyers can read documents for listings they have paid orders on
-- (Simplified policy for Phase 1 — Phase 3 will tighten to paid orders only)
CREATE POLICY "authenticated_read_listing_documents"
ON public.listing_documents FOR SELECT
TO authenticated
USING (true);

-- Admins full access
CREATE POLICY "admins_full_access_listing_documents"
ON public.listing_documents FOR ALL TO authenticated
USING (public.get_my_role() = 'admin');

-- ============================================================
-- Orders
-- ============================================================
CREATE TABLE public.orders (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id              uuid NOT NULL REFERENCES public.listings(id),
  buyer_id                uuid NOT NULL REFERENCES public.profiles(id),
  seller_id               uuid NOT NULL REFERENCES public.profiles(id),  -- denormalized
  status                  text NOT NULL DEFAULT 'pending_payment'
                          CHECK (status IN (
                            'pending_payment', 'paid', 'documents_sent',
                            'documents_signed', 'complete', 'cancelled', 'refunded'
                          )),
  price_cents             int  NOT NULL,
  stripe_payment_intent   text,
  stripe_checkout_session text,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_buyer_id ON public.orders (buyer_id);
CREATE INDEX idx_orders_seller_id ON public.orders (seller_id);
CREATE INDEX idx_orders_listing_id ON public.orders (listing_id);
CREATE INDEX idx_orders_status ON public.orders (status);

-- Buyers can see their own orders
CREATE POLICY "buyers_read_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- Sellers can see orders for their listings
CREATE POLICY "sellers_read_own_listing_orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'wholesaler'
  AND seller_id = auth.uid()
);

-- Consumers can create orders (purchase initiation — status starts at pending_payment)
CREATE POLICY "consumers_create_orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_role() = 'consumer'
  AND buyer_id = auth.uid()
);

-- Orders can only be updated by service_role (webhook handler uses admin client)
-- No direct client update policy — all order mutations go through server-side handlers

-- Admins full access
CREATE POLICY "admins_full_access_orders"
ON public.orders FOR ALL TO authenticated
USING (public.get_my_role() = 'admin');

-- ============================================================
-- Order Documents (generated post-payment)
-- ============================================================
CREATE TABLE public.order_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  document_type text NOT NULL
                CHECK (document_type IN ('purchase_agreement', 'title_transfer')),
  storage_key   text,        -- null until generated; path in order-documents bucket
  signed_at     timestamptz, -- null until signed
  signer_id     uuid REFERENCES public.profiles(id),
  esign_ref     text,        -- Dropbox Sign envelope ID
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'signed', 'voided')),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_order_documents_order_id ON public.order_documents (order_id);

-- Buyers can read documents for their own orders
CREATE POLICY "buyers_read_own_order_documents"
ON public.order_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_documents.order_id AND buyer_id = auth.uid()
  )
);

-- Sellers can read order documents for their listings
CREATE POLICY "sellers_read_listing_order_documents"
ON public.order_documents FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'wholesaler'
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_documents.order_id AND seller_id = auth.uid()
  )
);

-- All mutations via service_role (webhook and document generation handlers)
-- No direct client insert/update policies

-- Admins full access
CREATE POLICY "admins_full_access_order_documents"
ON public.order_documents FOR ALL TO authenticated
USING (public.get_my_role() = 'admin');
