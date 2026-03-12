-- supabase/migrations/009_listings_pickup_zip.sql
-- Add nullable pickup_zip to listings.
-- pickup_zip is collected in wizard Step 2 (not at draft creation).
-- publishListingAction enforces it is set before going active.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pickup_zip TEXT;
