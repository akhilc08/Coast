-- Tighten document RLS: sellers cannot read inspection reports
-- Buyers limited to docs for listings they have orders on
-- Extends get_admin_users to include seller_tier

-- ============================================================
-- listing_documents: replace overly-broad read policy
-- ============================================================

DROP POLICY IF EXISTS "authenticated_read_listing_documents" ON public.listing_documents;

-- Sellers can read their own listing documents EXCEPT inspection_report
CREATE POLICY "sellers_read_own_docs_non_inspection"
ON public.listing_documents FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'wholesaler'
  AND document_type != 'inspection_report'
  AND EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = listing_documents.listing_id AND seller_id = auth.uid()
  )
);

-- Buyers can read documents for listings they have an order on
CREATE POLICY "buyers_read_docs_for_ordered_listing"
ON public.listing_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.listing_id = listing_documents.listing_id
      AND orders.buyer_id = auth.uid()
  )
);

-- ============================================================
-- car-documents storage: restrict to authorized readers
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_read_car_document(doc_storage_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listing_documents ld
    JOIN public.listings l ON l.id = ld.listing_id
    WHERE ld.storage_key = doc_storage_key
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() = 'wholesaler'
        AND l.seller_id = auth.uid()
        AND ld.document_type != 'inspection_report'
      )
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.listing_id = l.id AND o.buyer_id = auth.uid()
      )
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.can_read_car_document(text) TO authenticated;

DROP POLICY IF EXISTS "car_documents_authenticated_read" ON storage.objects;

CREATE POLICY "car_documents_restricted_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'car-documents'
  AND public.can_read_car_document(name)
);

-- ============================================================
-- get_admin_users: include seller_tier
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  company text,
  seller_tier int,
  banned_until timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, u.email::text, p.role, p.company, p.seller_tier, u.banned_until, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO service_role;
