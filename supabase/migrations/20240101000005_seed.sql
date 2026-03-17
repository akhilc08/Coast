-- Migration 005: Seed — demo wholesaler + 30 active vehicle listings
-- Safe to run on a fresh DB. Skips gracefully if the wholesaler already exists.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  seller uuid := '00000000-dead-beef-0000-000000000001';
BEGIN

  -- ----------------------------------------------------------------
  -- 1. Demo wholesaler in auth.users
  --    trigger (handle_new_user) will auto-create the profiles row
  --    with role='wholesaler' from raw_app_meta_data.
  -- ----------------------------------------------------------------
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    created_at, updated_at
  ) VALUES (
    seller,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo-wholesaler@coast.dev',
    extensions.crypt('DemoPass123!', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"wholesaler"}'::jsonb,
    '{"full_name":"Demo Auto Group"}'::jsonb,
    false, false, false,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------------
  -- 2. Fill in wholesaler-specific profile fields the trigger skips
  -- ----------------------------------------------------------------
  UPDATE public.profiles
  SET company = 'Demo Auto Group',
      phone   = '(555) 000-9999'
  WHERE id = seller;

  -- ----------------------------------------------------------------
  -- 3. 30 active listings
  -- ----------------------------------------------------------------
  INSERT INTO public.listings (
    seller_id, status, title,
    make, model, year, mileage, color, vin,
    price_cents, condition_notes,
    grade, grade_source, graded_at, published_at
  ) VALUES

    (seller,'active','2022 Toyota Camry SE',
     'Toyota','Camry',2022,34200,'Midnight Black','4T1B21HK5NU045231',
     2195000,'Light wear on driver seat. Clean Carfax. New tires.',
     'B','manual',NOW(),NOW()),

    (seller,'active','2021 Honda Accord EX',
     'Honda','Accord',2021,47800,'Platinum White Pearl','1HGCV1F34MA012345',
     2095000,'No accidents. Minor scuff on rear bumper. Non-smoker.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2023 Ford F-150 XLT',
     'Ford','F-150',2023,18500,'Oxford White','1FTFW1E85NFA23456',
     3895000,'Like new. Tow package. Spray-in bed liner included.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2020 Chevrolet Tahoe LT',
     'Chevrolet','Tahoe',2020,68400,'Shadow Gray Metallic','1GNSKCKC5LR345678',
     3295000,'Third row intact. Two minor door dings. Well maintained.',
     'B','manual',NOW(),NOW()),

    (seller,'active','2019 BMW 330i xDrive',
     'BMW','3 Series',2019,54300,'Alpine White','WBA5R7C54KAF45678',
     2695000,'Sport package. Recent brake service. Minor curb rash on 18" wheels.',
     'C','manual',NOW(),NOW()),

    (seller,'active','2022 Nissan Altima SR',
     'Nissan','Altima',2022,28900,'Gun Metallic','1N4BL4EW4NN456789',
     2045000,'One owner. No accidents. All-season floor mats included.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2021 Hyundai Sonata SEL',
     'Hyundai','Sonata',2021,39600,'Hampton Gray','5NPE34AF2MH567890',
     1895000,'Sunroof. Apple CarPlay. Minor paint chip on hood.',
     'B','manual',NOW(),NOW()),

    (seller,'active','2020 Jeep Grand Cherokee Laredo',
     'Jeep','Grand Cherokee',2020,59700,'Diamond Black Crystal','1C4RJFBG8LC678901',
     2495000,'4WD. Tow hitch. Front bumper repainted — CARFAX shows minor collision.',
     'C','manual',NOW(),NOW()),

    (seller,'active','2023 Kia Telluride EX',
     'Kia','Telluride',2023,14200,'Snow White Pearl','5XYP5DHC2PG789012',
     3995000,'Low miles. Panoramic roof. Third-row seating. Clean title.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2021 Toyota RAV4 XLE',
     'Toyota','RAV4',2021,41500,'Blueprint Blue','2T3P1RFV6MW890123',
     2795000,'AWD. Heated front seats. Clean Carfax. Single owner.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2022 Honda CR-V Sport',
     'Honda','CR-V',2022,31200,'Sonic Gray Pearl','5J6RW2H83NA901234',
     2695000,'Turbocharged. Power tailgate. Light stain on rear seat.',
     'B','manual',NOW(),NOW()),

    (seller,'active','2019 Ford Explorer XLT',
     'Ford','Explorer',2019,77600,'Magnetic Gray Metallic','1FM5K8D80KGA12345',
     1995000,'3rd row. Dual sunroof. Needs rear tires. Minor door ding.',
     'C','manual',NOW(),NOW()),

    (seller,'active','2021 Chevrolet Silverado 1500 LT',
     'Chevrolet','Silverado 1500',2021,52300,'Northsky Blue Metallic','3GCUYDED5MG123456',
     3495000,'5.3L V8. Crew cab. Aftermarket tonneau cover. Clean history.',
     'B','manual',NOW(),NOW()),

    (seller,'active','2020 Mercedes-Benz C300',
     'Mercedes-Benz','C-Class',2020,43800,'Polar White','55SWF8DB2LU234567',
     3195000,'AMG sport package. Heated seats. Minor scuff on right mirror cap.',
     'B','manual',NOW(),NOW()),

    (seller,'active','2022 Subaru Outback Premium',
     'Subaru','Outback',2022,27500,'Autumn Green','4S4BTAMC8N3345678',
     2595000,'AWD. EyeSight driver assist. Dog guard installed. Clean title.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2021 Audi A4 Premium',
     'Audi','A4',2021,36700,'Florett Silver Metallic','WAUENAF42MN456789',
     3095000,'Quattro AWD. Virtual cockpit. Paint protection film on hood.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2019 Ram 1500 Big Horn',
     'Ram','1500',2019,83400,'Bright White','1C6SRFFT3KN567890',
     2295000,'HEMI V8. Crew cab. Tonneau cover. Needs alignment. High miles.',
     'D','manual',NOW(),NOW()),

    (seller,'active','2022 GMC Yukon SLE',
     'GMC','Yukon',2022,38100,'Onyx Black','1GKS2BKC4NR678901',
     4395000,'Max trailering package. Power running boards. 3rd row. One owner.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2021 Lexus RX 350 AWD',
     'Lexus','RX 350',2021,44600,'Eminent White Pearl','2T2BZMCA8MC789012',
     3895000,'Premium Plus package. Mark Levinson audio. No accidents.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2023 Toyota Highlander XLE',
     'Toyota','Highlander',2023,12800,'Midnight Black Metallic','5TDHZRBH4PS890123',
     3695000,'Nearly new. 8-passenger. BSM and RCTA. Clean title.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2020 Honda Pilot EX-L',
     'Honda','Pilot',2020,61300,'Lunar Silver Metallic','5FNYF6H57LB901234',
     2695000,'AWD. Heated leather seats. Blind-spot monitoring. Minor rear bumper scuff.',
     'B','manual',NOW(),NOW()),

    (seller,'active','2022 Mazda CX-5 Touring',
     'Mazda','CX-5',2022,29700,'Soul Red Crystal Metallic','JM3KFBCM6N0012345',
     2795000,'Turbocharged. Bose audio. No accidents. One chip on windshield.',
     'B','manual',NOW(),NOW()),

    (seller,'active','2019 Volkswagen Jetta SE',
     'Volkswagen','Jetta',2019,62400,'Platinum Gray Metallic','3VWC57BU3KM123456',
     1395000,'Manual transmission. Clean Carfax. New clutch at 55k. Light wear.',
     'C','manual',NOW(),NOW()),

    (seller,'active','2021 Ford Mustang EcoBoost',
     'Ford','Mustang',2021,27800,'Grabber Yellow','1FA6P8TH3M5234567',
     2995000,'6-speed manual. Performance package. Low miles. Clean title.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2022 Chevrolet Equinox LT',
     'Chevrolet','Equinox',2022,24300,'Mosaic Black Metallic','2GNAXUEV0N6345678',
     2195000,'AWD. Heated front seats. Remote start. No accidents.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2020 Subaru Forester Premium',
     'Subaru','Forester',2020,53600,'Crystal Black Silica','JF2SKAEC6LH456789',
     2095000,'EyeSight. Panoramic sunroof. Needs rear brake pads. Otherwise clean.',
     'C','manual',NOW(),NOW()),

    (seller,'active','2021 Kia Sportage EX',
     'Kia','Sportage',2021,44100,'Wolf Gray','KNDPMCAC8M7567890',
     1995000,'AWD. Heated front seats. Apple CarPlay. Minor rear-end incident on record.',
     'C','manual',NOW(),NOW()),

    (seller,'active','2023 Hyundai Tucson Hybrid SEL',
     'Hyundai','Tucson',2023,15600,'Shimmering Silver','5NMJB3AE0PH678901',
     2895000,'Hybrid AWD. Nearly new. Wireless CarPlay. Clean title.',
     'A','manual',NOW(),NOW()),

    (seller,'active','2020 Dodge Charger SXT',
     'Dodge','Charger',2020,58700,'TorRed','2C3CDXBG5LH789012',
     2295000,'RWD. 3.6L V6. Sport mode. Rear tires at 30%. Clean Carfax.',
     'B','manual',NOW(),NOW()),

    (seller,'active','2022 Toyota Tacoma SR5',
     'Toyota','Tacoma',2022,31500,'Cement Gray Metallic','5TFCZ5AN3NX890123',
     3595000,'4x4. Double cab. TRD off-road package. Bed extender included.',
     'A','manual',NOW(),NOW());

END $$;
