-- Add pending_inspection/paused statuses, seller_tier on profiles,
-- and fix listing_documents document_type constraint

-- Extend listing status check constraint to include new workflow states
ALTER TABLE public.listings DROP CONSTRAINT listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'active', 'sold', 'archived', 'pending_inspection', 'paused'));

-- seller_tier: 1 = standard (listings require admin inspection before going live)
--              2 = trusted  (listings can be published directly by the seller)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_tier int NOT NULL DEFAULT 1;

-- Allow inspection_report as a document type (was missing from original constraint)
ALTER TABLE public.listing_documents DROP CONSTRAINT IF EXISTS listing_documents_document_type_check;
ALTER TABLE public.listing_documents ADD CONSTRAINT listing_documents_document_type_check
  CHECK (document_type IN ('carfax', 'title', 'service_history', 'other', 'inspection_report'));
