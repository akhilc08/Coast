-- Add trim and body style fields populated from NHTSA VIN decode
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS trim       text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS body_class text;
