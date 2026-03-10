-- Migration 001: Profiles table, Custom Access Token Hook, and on_auth_user_created trigger
-- Apply via Supabase dashboard SQL editor or Supabase CLI

-- ============================================================
-- Helper function: get_my_role()
-- Used in all RLS policies that check application role.
-- Reads from JWT app_metadata (populated by custom_access_token_hook).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')
$$;

-- ============================================================
-- Custom Access Token Hook
-- Fires before every JWT is issued.
-- Injects profiles.role into app_metadata.
-- MUST be registered in Supabase Dashboard after migration:
--   Authentication > Hooks > Custom Access Token Hook > select public.custom_access_token_hook
-- ============================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      COALESCE(claims->'app_metadata', '{}'::jsonb) || jsonb_build_object('role', user_role)
    );
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$$;

-- Grant execute to supabase_auth_admin (required for Auth Hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- ============================================================
-- Profiles table
-- Extends auth.users with application-level user data.
-- role column is the source of truth for role-based access.
-- ============================================================
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'consumer'
              CHECK (role IN ('consumer', 'wholesaler', 'admin')),
  full_name   text,
  company     text,   -- wholesalers only
  phone       text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own_profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own non-role fields
-- Role column is locked to prevent self-elevation
CREATE POLICY "users_update_own_profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Admins can read all profiles (needed for admin panel in Phase 4)
CREATE POLICY "admins_read_all_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.get_my_role() = 'admin');

-- Admins can update any profile (for role management in Phase 4)
CREATE POLICY "admins_update_all_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.get_my_role() = 'admin');

-- Direct client inserts are blocked — profiles are created by the trigger only
CREATE POLICY "deny_direct_client_insert"
ON public.profiles FOR INSERT
WITH CHECK (false);

-- ============================================================
-- on_auth_user_created trigger
-- Auto-inserts a profiles row on every signup.
-- raw_app_meta_data.role is set by admin when creating wholesaler accounts.
-- Defaults to 'consumer' for self-signup.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'consumer')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but do not block the signup
  RAISE WARNING 'handle_new_user: failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
