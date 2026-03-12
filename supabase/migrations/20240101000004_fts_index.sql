-- 004_fts_index.sql
-- Adds full-text search column to listings for make/model/year search

ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce(make, '') || ' ' ||
    coalesce(model, '') || ' ' ||
    coalesce(year::text, '')
  )
) STORED;

CREATE INDEX IF NOT EXISTS idx_listings_fts ON public.listings USING GIN (fts);
