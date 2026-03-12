-- title is derived from make/model/year and not available at draft creation time
ALTER TABLE public.listings ALTER COLUMN title DROP NOT NULL;
