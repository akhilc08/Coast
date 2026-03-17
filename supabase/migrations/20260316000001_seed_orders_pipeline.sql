-- Migration: Seed orders in paid and signed states for admin orders page demo
-- Safe to re-run: all INSERTs use fixed UUIDs with ON CONFLICT DO NOTHING

DO $$
DECLARE
  seller  uuid := '00000000-dead-beef-0000-000000000001';
  buyer   uuid := '00000000-dead-beef-0000-000000000002';

  -- listing IDs resolved by VIN
  l_crv       uuid;
  l_explorer  uuid;
  l_silverado uuid;
  l_mercedes  uuid;
  l_outback   uuid;
  l_sonata    uuid;
  l_jeep      uuid;

  -- paid order IDs
  o_paid_crv       uuid := '00000000-00a0-0001-0000-000000000001';
  o_paid_explorer  uuid := '00000000-00a0-0002-0000-000000000001';
  o_paid_silverado uuid := '00000000-00a0-0003-0000-000000000001';

  -- signed order IDs
  o_sign_mercedes uuid := '00000000-00b0-0001-0000-000000000001';
  o_sign_outback  uuid := '00000000-00b0-0002-0000-000000000001';
  o_sign_sonata   uuid := '00000000-00b0-0003-0000-000000000001';
  o_sign_jeep     uuid := '00000000-00b0-0004-0000-000000000001';

BEGIN

  -- Resolve listing IDs by VIN
  SELECT id INTO l_crv       FROM public.listings WHERE vin = '5J6RW2H83NA901234';
  SELECT id INTO l_explorer  FROM public.listings WHERE vin = '1FM5K8D80KGA12345';
  SELECT id INTO l_silverado FROM public.listings WHERE vin = '3GCUYDED5MG123456';
  SELECT id INTO l_mercedes  FROM public.listings WHERE vin = '55SWF8DB2LU234567';
  SELECT id INTO l_outback   FROM public.listings WHERE vin = '4S4BTAMC8N3345678';
  SELECT id INTO l_sonata    FROM public.listings WHERE vin = '5NPE34AF2MH567890';
  SELECT id INTO l_jeep      FROM public.listings WHERE vin = '1C4RJFBG8LC678901';

  -- Paid orders (payment received, awaiting document signing)
  INSERT INTO public.orders (id, listing_id, buyer_id, seller_id, status, price_cents, created_at, updated_at) VALUES
    (o_paid_crv,       l_crv,       buyer, seller, 'paid', 2695000, NOW() - interval '3 days',  NOW() - interval '3 days'),
    (o_paid_explorer,  l_explorer,  buyer, seller, 'paid', 1995000, NOW() - interval '5 days',  NOW() - interval '5 days'),
    (o_paid_silverado, l_silverado, buyer, seller, 'paid', 3495000, NOW() - interval '8 days',  NOW() - interval '8 days')
  ON CONFLICT (id) DO NOTHING;

  -- Signed orders (documents signed, awaiting delivery)
  INSERT INTO public.orders (id, listing_id, buyer_id, seller_id, status, price_cents, created_at, updated_at) VALUES
    (o_sign_mercedes, l_mercedes, buyer, seller, 'documents_signed', 3195000, NOW() - interval '12 days', NOW() - interval '10 days'),
    (o_sign_outback,  l_outback,  buyer, seller, 'documents_signed', 2595000, NOW() - interval '16 days', NOW() - interval '14 days'),
    (o_sign_sonata,   l_sonata,   buyer, seller, 'documents_signed', 1895000, NOW() - interval '22 days', NOW() - interval '19 days'),
    (o_sign_jeep,     l_jeep,     buyer, seller, 'documents_signed', 2495000, NOW() - interval '28 days', NOW() - interval '25 days')
  ON CONFLICT (id) DO NOTHING;

END $$;
