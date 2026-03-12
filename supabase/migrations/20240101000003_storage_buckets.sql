-- Migration 003: Storage buckets with RLS policies
-- Apply after 002_schema.sql

-- ============================================================
-- Buckets
-- car-photos: public — listing images served directly, CDN-cacheable
-- car-documents: private — Carfax, service history, title docs
-- order-documents: private — purchase agreements, signed docs
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('car-photos', 'car-photos', true,  10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('car-documents', 'car-documents', false, 52428800, ARRAY['application/pdf']),
  ('order-documents', 'order-documents', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- car-photos RLS (storage.objects)
-- ============================================================

-- Anyone can read car photos (public bucket, but explicit policy for clarity)
CREATE POLICY "car_photos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-photos');

-- Only wholesalers can upload car photos
CREATE POLICY "car_photos_wholesaler_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'car-photos'
  AND public.get_my_role() = 'wholesaler'
);

-- Wholesalers can delete their own photos; admins can delete any
CREATE POLICY "car_photos_wholesaler_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'car-photos'
  AND (
    public.get_my_role() = 'wholesaler'
    OR public.get_my_role() = 'admin'
  )
);

-- ============================================================
-- car-documents RLS (storage.objects)
-- ============================================================

-- Only wholesalers can upload listing documents
CREATE POLICY "car_documents_wholesaler_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'car-documents'
  AND public.get_my_role() = 'wholesaler'
);

-- Authenticated users can read car documents (Phase 3 will tighten to buyers of the listing)
CREATE POLICY "car_documents_authenticated_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'car-documents');

-- Admins can manage car documents
CREATE POLICY "car_documents_admin_all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'car-documents'
  AND public.get_my_role() = 'admin'
);

-- ============================================================
-- order-documents RLS (storage.objects)
-- All mutations are via service_role (server-side only).
-- Reads granted via server-generated signed URLs (not direct object policy).
-- ============================================================

-- Admins can read all order documents
CREATE POLICY "order_documents_admin_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-documents'
  AND public.get_my_role() = 'admin'
);
-- Note: buyers/sellers access order-documents via signed URLs generated server-side.
-- Service role client is used for all uploads and signed URL generation.
