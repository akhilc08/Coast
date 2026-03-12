-- Migration 010: Seed reviews — demo buyer + completed orders + reviews with seller replies
-- Safe to re-run: all INSERTs use ON CONFLICT DO NOTHING or fixed UUIDs.

DO $$
DECLARE
  seller  uuid := '00000000-dead-beef-0000-000000000001';
  buyer   uuid := '00000000-dead-beef-0000-000000000002';

  -- listing IDs resolved by VIN (VINs are unique in seed data)
  l_camry       uuid;
  l_accord      uuid;
  l_f150        uuid;
  l_tahoe       uuid;
  l_bmw         uuid;
  l_altima      uuid;
  l_telluride   uuid;
  l_rav4        uuid;

  -- order IDs (fixed so this is idempotent)
  o_camry     uuid := '00000000-00de-0001-0000-000000000001';
  o_accord    uuid := '00000000-00de-0002-0000-000000000001';
  o_f150      uuid := '00000000-00de-0003-0000-000000000001';
  o_tahoe     uuid := '00000000-00de-0004-0000-000000000001';
  o_bmw       uuid := '00000000-00de-0005-0000-000000000001';
  o_altima    uuid := '00000000-00de-0006-0000-000000000001';
  o_telluride uuid := '00000000-00de-0007-0000-000000000001';
  o_rav4      uuid := '00000000-00de-0008-0000-000000000001';

BEGIN

  -- ----------------------------------------------------------------
  -- 1. Demo buyer
  -- ----------------------------------------------------------------
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    created_at, updated_at
  ) VALUES (
    buyer,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo-buyer@coast.dev',
    extensions.crypt('DemoPass123!', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"consumer"}'::jsonb,
    '{"full_name":"Jordan Mitchell"}'::jsonb,
    false, false, false,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------------
  -- 2. Resolve listing IDs by VIN
  -- ----------------------------------------------------------------
  SELECT id INTO l_camry     FROM public.listings WHERE vin = '4T1B21HK5NU045231';
  SELECT id INTO l_accord    FROM public.listings WHERE vin = '1HGCV1F34MA012345';
  SELECT id INTO l_f150      FROM public.listings WHERE vin = '1FTFW1E85NFA23456';
  SELECT id INTO l_tahoe     FROM public.listings WHERE vin = '1GNSKCKC5LR345678';
  SELECT id INTO l_bmw       FROM public.listings WHERE vin = 'WBA5R7C54KAF45678';
  SELECT id INTO l_altima    FROM public.listings WHERE vin = '1N4BL4EW4NN456789';
  SELECT id INTO l_telluride FROM public.listings WHERE vin = '5XYP5DHC2PG789012';
  SELECT id INTO l_rav4      FROM public.listings WHERE vin = '2T3P1RFV6MW890123';

  -- ----------------------------------------------------------------
  -- 3. Completed orders
  -- ----------------------------------------------------------------
  INSERT INTO public.orders (id, listing_id, buyer_id, seller_id, status, price_cents, created_at, updated_at) VALUES
    (o_camry,     l_camry,     buyer, seller, 'complete', 2195000, NOW() - interval '120 days', NOW() - interval '115 days'),
    (o_accord,    l_accord,    buyer, seller, 'complete', 2095000, NOW() - interval '90 days',  NOW() - interval '85 days'),
    (o_f150,      l_f150,      buyer, seller, 'complete', 3895000, NOW() - interval '60 days',  NOW() - interval '55 days'),
    (o_tahoe,     l_tahoe,     buyer, seller, 'complete', 3295000, NOW() - interval '45 days',  NOW() - interval '40 days'),
    (o_bmw,       l_bmw,       buyer, seller, 'complete', 2695000, NOW() - interval '30 days',  NOW() - interval '25 days'),
    (o_altima,    l_altima,    buyer, seller, 'complete', 2045000, NOW() - interval '20 days',  NOW() - interval '15 days'),
    (o_telluride, l_telluride, buyer, seller, 'complete', 3995000, NOW() - interval '14 days',  NOW() - interval '10 days'),
    (o_rav4,      l_rav4,      buyer, seller, 'complete', 2795000, NOW() - interval '7 days',   NOW() - interval '5 days')
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------------
  -- 4. Reviews (bypass RLS — migration runs as superuser)
  -- ----------------------------------------------------------------
  INSERT INTO public.reviews (order_id, buyer_id, seller_id, listing_id, rating, body, seller_reply, replied_at, created_at) VALUES

    (o_camry, buyer, seller, l_camry, 5,
     'Smooth transaction from start to finish. Car was exactly as described — the minor driver seat wear was clearly noted and totally accurate. Title transferred without any issues. Would definitely buy from Demo Auto Group again.',
     'Thank you Jordan! Really appreciate the kind words. Enjoy the Camry — it''s a great car.',
     NOW() - interval '113 days',
     NOW() - interval '115 days'),

    (o_accord, buyer, seller, l_accord, 5,
     'One of the cleanest Accords I''ve seen at this price point. No surprises, no games. The photos matched reality and the CarFax was clean as listed. Fast paperwork too.',
     NULL, NULL,
     NOW() - interval '83 days'),

    (o_f150, buyer, seller, l_f150, 4,
     'Great truck, great price. Tow package and bed liner are both quality installs. Only reason for 4 stars is the process took a couple extra days on the title side, but overall I''m very happy with the purchase.',
     'Appreciate the feedback! Sorry about the title delay — we''ve since streamlined that process. Hope the F-150 is treating you well.',
     NOW() - interval '52 days',
     NOW() - interval '53 days'),

    (o_tahoe, buyer, seller, l_tahoe, 4,
     'Solid Tahoe. The two door dings are minor and exactly as advertised. Third row is in great shape which was my main concern. Responsive seller and good communication throughout.',
     NULL, NULL,
     NOW() - interval '38 days'),

    (o_bmw, buyer, seller, l_bmw, 3,
     'The curb rash on the wheels was more pronounced than the listing photos suggested. Car itself runs great and everything mechanical is solid, but I had to budget for a wheel refinish. Be more detailed in the photos next time.',
     'Fair feedback — we''ve updated our photo policy to include close-up wheel shots on all listings. Sorry for the extra expense, and glad the car is running well.',
     NOW() - interval '23 days',
     NOW() - interval '24 days'),

    (o_altima, buyer, seller, l_altima, 5,
     'Perfect one-owner Altima. The all-season mats were a nice bonus. Clean title, no drama. This is how a dealer transaction should work.',
     'Thank you! One-owner cars are the best and this one was a gem. Glad it found a good home.',
     NOW() - interval '13 days',
     NOW() - interval '14 days'),

    (o_telluride, buyer, seller, l_telluride, 5,
     'Absolutely love this Telluride. Low miles, immaculate interior, panoramic roof works perfectly. Paid a fair price and got a fair car. Demo Auto Group clearly takes pride in their inventory.',
     NULL, NULL,
     NOW() - interval '9 days'),

    (o_rav4, buyer, seller, l_rav4, 4,
     'Clean RAV4 with a legit CarFax. Heated seats are a bonus I didn''t expect to use but now can''t live without. Slight miscommunication on pickup time but nothing major. Overall great experience.',
     NULL, NULL,
     NOW() - interval '4 days')

  ON CONFLICT (order_id) DO NOTHING;

END $$;
