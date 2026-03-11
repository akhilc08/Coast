-- Migration 006: RPC function for admin user listing
-- Bypasses auth.admin.listUsers() which conflicts with Custom Access Token Hook
-- Returns joined auth.users + profiles data for the admin panel

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  company text,
  banned_until timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, u.email::text, p.role, p.company, u.banned_until, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
$$;

-- Only service_role and admin can call this
REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO service_role;
