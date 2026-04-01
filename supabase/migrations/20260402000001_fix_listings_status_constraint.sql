-- Idempotent fix: ensure listings status constraint includes pending_inspection and paused.
-- Two prior migrations shared the same timestamp (20260401000000_listing_flow and
-- 20260401000000_seller_dashboard_improvements), which may have caused listing_flow
-- to be skipped. Drop and recreate unconditionally.
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'active', 'sold', 'archived', 'pending_inspection', 'paused'));
