-- AI-extracted condition data stored as JSONB per section
ALTER TABLE public.listings
  ADD COLUMN ai_condition_exterior   JSONB,
  ADD COLUMN ai_condition_interior   JSONB,
  ADD COLUMN ai_condition_mechanical JSONB,
  ADD COLUMN ai_condition_tires      JSONB,
  -- Lock flag: once AI extraction is confirmed, seller cannot modify
  ADD COLUMN condition_locked        boolean NOT NULL DEFAULT false,
  -- Storage key of the uploaded inspection PDF
  ADD COLUMN condition_pdf_key       text;
