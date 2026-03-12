-- Migration: Seed condition assessment data for existing demo listings
-- Updates listings with realistic structured condition data across all 7 sections.
-- Keyed by VIN so it's idempotent.

UPDATE public.listings SET
  overall_grade     = 'good',
  overall_notes     = 'Well-maintained commuter. Light interior wear consistent with mileage. No structural issues.',
  paint_condition   = 'good',
  body_condition    = 'good',
  glass_condition   = 'excellent',
  exterior_notes    = 'One small paint chip on hood (2mm). All panels straight. Rubber seals intact.',
  interior_condition = 'fair',
  seat_condition    = 'fair',
  carpet_condition  = 'good',
  interior_notes    = 'Driver seat bolster shows wear. Rear carpet has light staining near left door.',
  engine_condition  = 'good',
  transmission_condition = 'good',
  mechanical_notes  = 'All fluids topped. Recent oil change. Brakes at 60%. No check engine light.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = 'Driver seat bolster wear. Small paint chip hood.',
  has_accidents     = false,
  accident_details  = NULL,
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = NULL
WHERE vin = '4T1B21HK5NU045231';  -- 2022 Toyota Camry SE

UPDATE public.listings SET
  overall_grade     = 'excellent',
  overall_notes     = 'One owner, no accidents, low wear for mileage. A clean example.',
  paint_condition   = 'excellent',
  body_condition    = 'excellent',
  glass_condition   = 'excellent',
  exterior_notes    = 'Minor scuff on rear bumper per listing. Paint otherwise excellent. No rust.',
  interior_condition = 'excellent',
  seat_condition    = 'excellent',
  carpet_condition  = 'excellent',
  interior_notes    = 'Non-smoker vehicle. No stains or odors. All switches functional.',
  engine_condition  = 'excellent',
  transmission_condition = 'excellent',
  mechanical_notes  = 'Recent dealer service. Tires at 80%. All fluids good.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = 'Minor scuff rear bumper (cosmetic only).',
  has_accidents     = false,
  accident_details  = NULL,
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = NULL
WHERE vin = '1HGCV1F34MA012345';  -- 2021 Honda Accord EX

UPDATE public.listings SET
  overall_grade     = 'excellent',
  overall_notes     = 'Like new condition. Low miles, tow package factory installed, bed liner professionally sprayed.',
  paint_condition   = 'excellent',
  body_condition    = 'excellent',
  glass_condition   = 'excellent',
  exterior_notes    = 'No chips, dings, or scratches. Spray-in bed liner in excellent condition.',
  interior_condition = 'excellent',
  seat_condition    = 'excellent',
  carpet_condition  = 'excellent',
  interior_notes    = 'Crew cab interior like new. All tech features functional.',
  engine_condition  = 'excellent',
  transmission_condition = 'excellent',
  mechanical_notes  = 'Only 18.5k miles. All factory warranty items current.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = NULL,
  has_accidents     = false,
  accident_details  = NULL,
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = NULL
WHERE vin = '1FTFW1E85NFA23456';  -- 2023 Ford F-150 XLT

UPDATE public.listings SET
  overall_grade     = 'good',
  overall_notes     = 'Higher mileage but well cared for. Two cosmetic door dings, otherwise solid.',
  paint_condition   = 'good',
  body_condition    = 'fair',
  glass_condition   = 'good',
  exterior_notes    = 'Two minor door dings on driver side (dime-sized). No rust. Paint faded slightly on roof.',
  interior_condition = 'good',
  seat_condition    = 'good',
  carpet_condition  = 'good',
  interior_notes    = 'Third row intact and functional. Cup holders clean. No odors.',
  engine_condition  = 'good',
  transmission_condition = 'good',
  mechanical_notes  = 'Recent transmission service. Brakes at 50%. AC cold.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = 'Two door dings driver side. Roof paint slightly faded.',
  has_accidents     = false,
  accident_details  = NULL,
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = NULL
WHERE vin = '1GNSKCKC5LR345678';  -- 2020 Chevrolet Tahoe LT

UPDATE public.listings SET
  overall_grade     = 'fair',
  overall_notes     = 'Runs great mechanically but curb rash on all four wheels is noticeable. Price reflects condition.',
  paint_condition   = 'good',
  body_condition    = 'good',
  glass_condition   = 'good',
  exterior_notes    = 'Minor curb rash on all four 18" wheels. Body panels straight. No chips.',
  interior_condition = 'good',
  seat_condition    = 'good',
  carpet_condition  = 'good',
  interior_notes    = 'Sport package interior in good shape. All electronics working.',
  engine_condition  = 'excellent',
  transmission_condition = 'excellent',
  mechanical_notes  = 'Recent brake service. Tires at 70%. Engine bay clean.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = 'Curb rash on all four wheels (cosmetic).',
  has_accidents     = false,
  accident_details  = NULL,
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = 'Curb rash disclosed and reflected in price. Wheels otherwise structurally sound.'
WHERE vin = 'WBA5R7C54KAF45678';  -- 2019 BMW 330i xDrive

UPDATE public.listings SET
  overall_grade     = 'excellent',
  overall_notes     = 'Single owner, no accidents, all-season floor mats included. Excellent value.',
  paint_condition   = 'excellent',
  body_condition    = 'excellent',
  glass_condition   = 'excellent',
  exterior_notes    = 'No imperfections. Gun metallic paint in excellent condition.',
  interior_condition = 'excellent',
  seat_condition    = 'excellent',
  carpet_condition  = 'excellent',
  interior_notes    = 'Clean and well kept. All-season mats protect carpet. No wear.',
  engine_condition  = 'excellent',
  transmission_condition = 'excellent',
  mechanical_notes  = 'CVT serviced. Tires at 75%. All fluids fresh.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = NULL,
  has_accidents     = false,
  accident_details  = NULL,
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = NULL
WHERE vin = '1N4BL4EW4NN456789';  -- 2022 Nissan Altima SR

UPDATE public.listings SET
  overall_grade     = 'good',
  overall_notes     = 'Nice mid-size with sunroof and tech features. Minor paint chip on hood otherwise clean.',
  paint_condition   = 'good',
  body_condition    = 'good',
  glass_condition   = 'excellent',
  exterior_notes    = 'Paint chip on hood (3mm). Sunroof glass clear with no cracks.',
  interior_condition = 'excellent',
  seat_condition    = 'excellent',
  carpet_condition  = 'excellent',
  interior_notes    = 'Sunroof works perfectly. Apple CarPlay connected without issues.',
  engine_condition  = 'good',
  transmission_condition = 'good',
  mechanical_notes  = 'All fluids good. Tires at 65%. Brakes at 55%.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = 'Paint chip on hood (minor cosmetic).',
  has_accidents     = false,
  accident_details  = NULL,
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = NULL
WHERE vin = '5NPE34AF2MH567890';  -- 2021 Hyundai Sonata SEL

UPDATE public.listings SET
  overall_grade     = 'fair',
  overall_notes     = 'CarFax shows one minor collision. Front bumper was repainted. Structurally sound, everything works.',
  paint_condition   = 'good',
  body_condition    = 'good',
  glass_condition   = 'good',
  exterior_notes    = 'Front bumper repainted — color match is good but not factory. No other body damage.',
  interior_condition = 'good',
  seat_condition    = 'good',
  carpet_condition  = 'good',
  interior_notes    = 'Intact and clean. No airbag deployment. All switches work.',
  engine_condition  = 'good',
  transmission_condition = 'good',
  mechanical_notes  = '4WD tested functional. Tow hitch solid. Brakes at 60%.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = 'Front bumper repainted after minor collision. Color match good.',
  has_accidents     = true,
  accident_details  = 'CARFAX shows one minor front-end collision. Bumper replaced and repainted. No structural or airbag involvement.',
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = 'Accident history disclosed in listing and reflected in price.'
WHERE vin = '1C4RJFBG8LC678901';  -- 2020 Jeep Grand Cherokee Laredo

UPDATE public.listings SET
  overall_grade     = 'excellent',
  overall_notes     = 'Barely used. Nearly new in every respect. Panoramic roof, third row, clean title.',
  paint_condition   = 'excellent',
  body_condition    = 'excellent',
  glass_condition   = 'excellent',
  exterior_notes    = 'Showroom condition. No marks. All trim pieces tight.',
  interior_condition = 'excellent',
  seat_condition    = 'excellent',
  carpet_condition  = 'excellent',
  interior_notes    = 'Third row looks unused. All screens and controls perfect.',
  engine_condition  = 'excellent',
  transmission_condition = 'excellent',
  mechanical_notes  = 'Only 14.2k miles. Factory warranty likely still active. All fluids original spec.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = NULL,
  has_accidents     = false,
  accident_details  = NULL,
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = NULL
WHERE vin = '5XYP5DHC2PG789012';  -- 2023 Kia Telluride EX

UPDATE public.listings SET
  overall_grade     = 'excellent',
  overall_notes     = 'AWD single-owner RAV4. Well-serviced, clean CarFax, heated seats.',
  paint_condition   = 'excellent',
  body_condition    = 'excellent',
  glass_condition   = 'excellent',
  exterior_notes    = 'Blueprint blue paint in excellent condition. No chips or scratches.',
  interior_condition = 'excellent',
  seat_condition    = 'excellent',
  carpet_condition  = 'excellent',
  interior_notes    = 'Heated seats work on all settings. No wear on any surfaces.',
  engine_condition  = 'excellent',
  transmission_condition = 'excellent',
  mechanical_notes  = 'AWD system tested. Tires at 70%. Recent dealer inspection.',
  ac_works          = true,
  heat_works        = true,
  known_issues      = NULL,
  has_accidents     = false,
  accident_details  = NULL,
  flood_damage      = false,
  frame_damage      = false,
  title_issues      = false,
  disclosure_notes  = NULL
WHERE vin = '2T3P1RFV6MW890123';  -- 2021 Toyota RAV4 XLE

-- Remaining 20 listings — populate with representative condition data

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'Turbocharged CR-V in solid shape. Light stain on rear seat noted.',
  paint_condition = 'good', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'No exterior damage. Power tailgate works smoothly.',
  interior_condition = 'good', seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Light stain rear left seat — came with car. Otherwise clean.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Turbocharged engine runs perfectly. Tires 65%.',
  ac_works = true, heat_works = true,
  known_issues = 'Light stain rear seat (cosmetic).',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '5J6RW2H83NA901234';  -- 2022 Honda CR-V

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'High miles. Needs rear tires. Mechanically sound otherwise.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Minor door ding passenger side. Dual sunroof glass intact.',
  interior_condition = 'good', seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Third row shows use but no damage. All seats fold correctly.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'Needs rear tires (at 15%). Brakes 55%. Engine runs well.',
  ac_works = true, heat_works = true,
  known_issues = 'Rear tires need replacement. Minor door ding.',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false,
  disclosure_notes = 'Rear tire wear disclosed. Priced accordingly.'
WHERE vin = '1FM5K8D80KGA12345';  -- 2019 Ford Explorer

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'V8 Silverado crew cab. Aftermarket tonneau cover adds value.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Northsky Blue paint holds well. Tonneau cover in excellent condition.',
  interior_condition = 'good', seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Crew cab spacious and clean. Minor wear on driver armrest.',
  engine_condition = 'excellent', transmission_condition = 'good',
  mechanical_notes = '5.3L V8 strong pull. Tires at 60%. Brakes at 65%.',
  ac_works = true, heat_works = true,
  known_issues = 'Minor wear on driver armrest.',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '3GCUYDED5MG123456';  -- 2021 Chevy Silverado 1500

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'Mercedes C300 AMG sport. Minor scuff on mirror cap, otherwise sharp.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Polar white paint immaculate. Minor scuff on right mirror cap (paintable).',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Heated leather seats excellent. All AMG trim pieces intact.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = '9G-Tronic smooth. Recent service. Tires 70%.',
  ac_works = true, heat_works = true,
  known_issues = 'Scuff on right mirror cap (cosmetic, ~$50 to fix).',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '55SWF8DB2LU234567';  -- 2020 Mercedes C300

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'AWD Outback with EyeSight. Dog guard installed by owner. Clean title.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Autumn green paint excellent. Roof rails and crossbars included.',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Dog guard professionally installed and removable. No pet hair or odor.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Lineartronic CVT healthy. EyeSight calibrated. Tires 75%.',
  ac_works = true, heat_works = true,
  known_issues = NULL,
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '4S4BTAMC8N3345678';  -- 2022 Subaru Outback

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Quattro Audi A4 with PPF on hood. Premium interior in great shape.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'PPF on hood and front bumper protects paint. No chips. Florett silver looks new.',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Virtual cockpit fully functional. Heated seats work. No wear.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'S tronic clean shifts. Quattro tested. Tires 65%.',
  ac_works = true, heat_works = true,
  known_issues = NULL,
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = 'WAUENAF42MN456789';  -- 2021 Audi A4

UPDATE public.listings SET
  overall_grade = 'poor', overall_notes = 'High mileage Ram. Needs alignment. HEMI runs strong but this is a work truck.',
  paint_condition = 'fair', body_condition = 'fair', glass_condition = 'good',
  exterior_notes = 'Bed liner worn. Minor scratches throughout. Paint faded on hood.',
  interior_condition = 'fair', seat_condition = 'fair', carpet_condition = 'fair',
  interior_notes = 'Heavy use interior. Rear seat shows wear. Cup holders stained.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'HEMI runs well. Needs alignment. Tires at 40%. Brakes at 45%.',
  ac_works = true, heat_works = true,
  known_issues = 'Needs alignment. Tires 40%. Interior wear throughout. High miles.',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false,
  disclosure_notes = 'High mileage work truck priced accordingly. Mechanicals solid.'
WHERE vin = '1C6SRFFT3KN567890';  -- 2019 Ram 1500 Big Horn

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'One-owner Yukon with max tow package. Power running boards, 3rd row intact.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Onyx black with no blemishes. Running boards power up/down correctly.',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Three rows all excellent. Rear entertainment screens work.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Max tow package hardware all present. Brakes 70%. Tires 80%.',
  ac_works = true, heat_works = true,
  known_issues = NULL,
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '1GKS2BKC4NR678901';  -- 2022 GMC Yukon SLE

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Lexus RX350 AWD Premium Plus. Mark Levinson audio perfect. No accidents.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Eminent white pearl stunning. No chips or scratches.',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Mark Levinson 15-speaker audio sounds incredible. All leather supple.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Regular Lexus dealer maintenance. Tires 65%. Brakes 70%.',
  ac_works = true, heat_works = true,
  known_issues = NULL,
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '2T2BZMCA8MC789012';  -- 2021 Lexus RX 350

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Nearly new Highlander. 8-passenger with BSM and RCTA. Clean title.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Midnight black metallic spotless. All trim pieces perfect.',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'All 8 seats excellent. Third row easy fold. Infotainment responsive.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Only 12.8k miles. Factory warranty active. All systems go.',
  ac_works = true, heat_works = true,
  known_issues = NULL,
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '5TDHZRBH4PS890123';  -- 2023 Toyota Highlander

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'AWD Pilot with heated leather. Minor rear bumper scuff. Solid family SUV.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Minor scuff rear bumper (noted in listing). Body otherwise solid.',
  interior_condition = 'good', seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Heated leather seats all functional. BSM sensors work.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'AWD fully functional. Tires 60%. Brakes 60%.',
  ac_works = true, heat_works = true,
  known_issues = 'Minor rear bumper scuff.',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '5FNYF6H57LB901234';  -- 2020 Honda Pilot

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'Turbocharged CX-5 Touring. Bose audio great. One windshield chip.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'good',
  exterior_notes = 'Soul red crystal paint stunning. One chip on windshield (non-crack, repairable).',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Bose 10-speaker audio perfect. No wear on surfaces.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Turbo pulls strong. Tires 70%. Brakes 75%.',
  ac_works = true, heat_works = true,
  known_issues = 'Single chip on windshield (repairable, ~$100).',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = 'JM3KFBCM6N0012345';  -- 2022 Mazda CX-5

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'Manual Jetta with new clutch. Light wear expected at 62k. Clean CarFax.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Platinum gray in good shape. Minor chips on front leading edge.',
  interior_condition = 'fair', seat_condition = 'fair', carpet_condition = 'good',
  interior_notes = 'Driver seat shows wear consistent with manual driving. Shifter knob worn.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'New clutch at 55k. Engine clean. Tires 55%.',
  ac_works = true, heat_works = true,
  known_issues = 'Driver seat wear. Minor hood chips. Shifter knob worn.',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '3VWC57BU3KM123456';  -- 2019 VW Jetta

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Low-mile Mustang with performance package. Clean and fast.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Grabber yellow turns heads. No chips or scratches. Spoiler tight.',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Performance Recaro-style seats excellent. Short throw shifter smooth.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = '6-speed performance package. Tires at 70% — sport tires. Brakes 80%.',
  ac_works = true, heat_works = true,
  known_issues = NULL,
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '1FA6P8TH3M5234567';  -- 2021 Ford Mustang

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'AWD Equinox with remote start. No accidents. Clean and ready.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Mosaic black metallic clean. No dents or scratches.',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Heated front seats work on all settings. Remote start tested.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'AWD solid. Tires 75%. Brakes 70%.',
  ac_works = true, heat_works = true,
  known_issues = NULL,
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '2GNAXUEV0N6345678';  -- 2022 Chevy Equinox

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'EyeSight Forester. Needs rear brakes. Panoramic sunroof works.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'excellent',
  exterior_notes = 'Crystal black silica paint good. Minor chips on hood.',
  interior_condition = 'good', seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Panoramic sunroof works perfectly. Sunshade intact.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'Needs rear brake pads (at 15%). Front brakes 65%. EyeSight functional.',
  ac_works = true, heat_works = true,
  known_issues = 'Rear brake pads need replacement soon.',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false,
  disclosure_notes = 'Rear brakes disclosed. Priced to account for service.'
WHERE vin = 'JF2SKAEC6LH456789';  -- 2020 Subaru Forester

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'AWD Sportage with accident on record. Mechanically fine. Priced for it.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Rear-end incident repaired. Panels aligned. Paint match acceptable.',
  interior_condition = 'good', seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'No airbag deployment. Interior fully intact.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'AWD functional. Brakes 60%. Tires 65%.',
  ac_works = true, heat_works = true,
  known_issues = 'Rear-end accident on record. Repaired professionally.',
  has_accidents = true,
  accident_details = 'CARFAX shows one rear-end incident. Bumper and trunk repaired. No structural or airbag involvement.',
  flood_damage = false, frame_damage = false, title_issues = false,
  disclosure_notes = 'Accident history fully disclosed. Priced accordingly.'
WHERE vin = 'KNDPMCAC8M7567890';  -- 2021 Kia Sportage

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Hybrid AWD Tucson. Nearly new. Wireless CarPlay works great.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Shimmering silver paint spotless. All sensors and cameras clean.',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Wireless CarPlay connects instantly. All screens crisp.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Hybrid system reads healthy. Only 15.6k miles. Warranty likely active.',
  ac_works = true, heat_works = true,
  known_issues = NULL,
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '5NMJB3AE0PH678901';  -- 2023 Hyundai Tucson Hybrid

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'TorRed Charger. Rear tires at 30% — budget for replacement. Otherwise solid.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'good',
  exterior_notes = 'TorRed paint excellent. No chips. Looks aggressive and clean.',
  interior_condition = 'good', seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Sport interior in good shape. Slight wear on driver bolster.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = '3.6L V6 smooth in all modes. Front brakes 65%. Rear tires at 30%.',
  ac_works = true, heat_works = true,
  known_issues = 'Rear tires at 30% — need replacement soon.',
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false,
  disclosure_notes = 'Rear tire wear disclosed. Priced accordingly.'
WHERE vin = '2C3CDXBG5LH789012';  -- 2020 Dodge Charger

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'TRD off-road Tacoma 4x4. Low miles for age. Bed extender included.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Cement gray metallic clean. TRD skid plates present. Bed extender secure.',
  interior_condition = 'excellent', seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Double cab interior minimal wear. TRD floor mats protect carpet.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = '4x4 low and high range both functional. Tires 70%. Brakes 75%.',
  ac_works = true, heat_works = true,
  known_issues = NULL,
  has_accidents = false, flood_damage = false, frame_damage = false, title_issues = false
WHERE vin = '5TFCZ5AN3NX890123';  -- 2022 Toyota Tacoma SR5
