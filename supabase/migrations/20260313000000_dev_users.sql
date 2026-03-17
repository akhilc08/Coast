-- Migration: Dev/test users
-- Creates admin, consumer, and wholesaler accounts for development.

DO $$
BEGIN

  -- Admin
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@drivewithcoast.com',
    extensions.crypt('AdminPass123!', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{"full_name":"Coast Admin"}'::jsonb,
    false, false, false,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Consumer
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'buyer@example.com',
    extensions.crypt('BuyerPass123!', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"consumer"}'::jsonb,
    '{"full_name":"Example Buyer"}'::jsonb,
    false, false, false,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Wholesaler
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0003-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'seller@example.com',
    extensions.crypt('SellerPass123!', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"wholesaler"}'::jsonb,
    '{"full_name":"Example Dealer"}'::jsonb,
    false, false, false,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Fill wholesaler profile fields
  UPDATE public.profiles
  SET company = 'Example Auto Group', phone = '(555) 000-1234'
  WHERE id = '00000000-0000-0000-0003-000000000001';

END $$;
