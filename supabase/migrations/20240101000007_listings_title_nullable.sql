-- These fields are filled in progressively through the listing wizard.
-- NOT NULL is enforced at the app level before publishing, not at the DB level.
ALTER TABLE public.listings ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.listings ALTER COLUMN make DROP NOT NULL;
ALTER TABLE public.listings ALTER COLUMN model DROP NOT NULL;
ALTER TABLE public.listings ALTER COLUMN year DROP NOT NULL;
ALTER TABLE public.listings ALTER COLUMN price_cents DROP NOT NULL;
