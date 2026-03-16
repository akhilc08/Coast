-- Add bio field to profiles for seller self-description
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- Recreate the public_seller_profiles view to include bio
CREATE OR REPLACE VIEW public.public_seller_profiles WITH (security_invoker = true) AS
  SELECT id, full_name, company, bio
  FROM public.profiles
  WHERE role = 'wholesaler';

-- Grant is inherited from the original view but re-state for safety
GRANT SELECT ON public.public_seller_profiles TO anon, authenticated;
