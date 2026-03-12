-- Migration: Seed condition assessment data for existing demo listings
-- Keyed by VIN so it's idempotent. Column names match 20260312000000_condition_fields.sql.

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'Well-maintained commuter. Light interior wear consistent with mileage.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'excellent',
  exterior_notes = 'One small paint chip on hood (2mm). All panels straight.',
  seat_condition = 'fair', carpet_condition = 'good',
  interior_notes = 'Driver seat bolster shows wear. Rear carpet has light staining.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'All fluids topped. Recent oil change. Brakes at 60%.',
  known_issues = ARRAY['Driver seat bolster wear', 'Small paint chip on hood'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '4T1B21HK5NU045231';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'One owner, no accidents, low wear for mileage.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Minor scuff on rear bumper. Paint otherwise excellent.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Non-smoker vehicle. No stains or odors.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Recent dealer service. Tires at 80%.',
  known_issues = ARRAY['Minor scuff rear bumper (cosmetic only)'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '1HGCV1F34MA012345';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Like new. Low miles, tow package, bed liner sprayed.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'No chips, dings, or scratches. Bed liner excellent.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Crew cab interior like new. All tech features functional.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Only 18.5k miles. All factory warranty items current.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '1FTFW1E85NFA23456';

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'Higher mileage but well cared for. Two cosmetic door dings.',
  paint_condition = 'good', body_condition = 'fair', glass_condition = 'good',
  exterior_notes = 'Two minor door dings on driver side. Paint faded slightly on roof.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Third row intact. Cup holders clean. No odors.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'Recent transmission service. Brakes at 50%.',
  known_issues = ARRAY['Two door dings driver side', 'Roof paint slightly faded'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '1GNSKCKC5LR345678';

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'Runs great mechanically but curb rash on all four wheels.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Minor curb rash on all four 18" wheels. Body panels straight.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Sport package interior in good shape.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Recent brake service. Tires at 70%.',
  known_issues = ARRAY['Curb rash on all four wheels (cosmetic)'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = 'WBA5R7C54KAF45678';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Single owner, no accidents, all-season mats included.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'No imperfections. Gun metallic paint excellent.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Clean and well kept. All-season mats protect carpet.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'CVT serviced. Tires at 75%.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '1N4BL4EW4NN456789';

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'Sunroof, CarPlay, heated seats. Minor paint chip on hood.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'excellent',
  exterior_notes = 'Paint chip on hood (3mm). Sunroof glass clear.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Sunroof works perfectly. Apple CarPlay connected.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'All fluids good. Tires at 65%.',
  known_issues = ARRAY['Paint chip on hood (minor cosmetic)'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '5NPE34AF2MH567890';

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'CarFax shows one minor collision. Front bumper repainted. Structurally sound.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Front bumper repainted — color match good but not factory.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'No airbag deployment. Interior fully intact.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = '4WD tested. Tow hitch solid. Brakes at 60%.',
  known_issues = ARRAY['Front bumper repainted after minor collision'],
  has_accident_history = true, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '1C4RJFBG8LC678901';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Barely used. Nearly new. Panoramic roof, third row, clean title.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Showroom condition. No marks.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Third row looks unused. All screens perfect.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Only 14.2k miles. Factory warranty likely active.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '5XYP5DHC2PG789012';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'AWD single-owner RAV4. Well-serviced, clean CarFax.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Blueprint blue paint excellent. No chips.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Heated seats work on all settings.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'AWD system tested. Tires at 70%.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '2T3P1RFV6MW890123';

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'Turbocharged CR-V. Light stain on rear seat.',
  paint_condition = 'good', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'No exterior damage. Power tailgate works.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Light stain rear left seat — cosmetic only.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Turbo engine runs perfectly. Tires 65%.',
  known_issues = ARRAY['Light stain rear seat (cosmetic)'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '5J6RW2H83NA901234';

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'High miles. Needs rear tires. Mechanically sound.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Minor door ding passenger side.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Third row shows use but no damage.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'Needs rear tires (at 15%). Brakes 55%.',
  known_issues = ARRAY['Rear tires need replacement', 'Minor door ding'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '1FM5K8D80KGA12345';

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'V8 Silverado crew cab. Aftermarket tonneau cover.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Northsky Blue paint holds well. Tonneau cover excellent.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Crew cab clean. Minor wear on driver armrest.',
  engine_condition = 'excellent', transmission_condition = 'good',
  mechanical_notes = '5.3L V8 strong. Tires at 60%.',
  known_issues = ARRAY['Minor wear on driver armrest'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '3GCUYDED5MG123456';

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'Mercedes C300 AMG. Minor scuff on mirror cap.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Polar white immaculate. Minor scuff on right mirror cap.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Heated leather seats excellent.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = '9G-Tronic smooth. Tires 70%.',
  known_issues = ARRAY['Scuff on right mirror cap (~$50 to fix)'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '55SWF8DB2LU234567';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'AWD Outback with EyeSight. Dog guard installed.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Autumn green paint excellent. Roof rails included.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Dog guard removable. No pet hair or odor.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'CVT healthy. EyeSight calibrated. Tires 75%.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '4S4BTAMC8N3345678';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Quattro Audi A4 with PPF on hood.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'PPF on hood and front bumper. No chips.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Virtual cockpit functional. Heated seats work.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'S tronic clean shifts. Tires 65%.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = 'WAUENAF42MN456789';

UPDATE public.listings SET
  overall_grade = 'poor', overall_notes = 'High mileage Ram. Needs alignment. HEMI runs strong.',
  paint_condition = 'fair', body_condition = 'fair', glass_condition = 'good',
  exterior_notes = 'Bed liner worn. Minor scratches. Paint faded on hood.',
  seat_condition = 'fair', carpet_condition = 'fair',
  interior_notes = 'Heavy use interior. Rear seat shows wear.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'HEMI runs well. Needs alignment. Tires at 40%.',
  known_issues = ARRAY['Needs alignment', 'Tires at 40%', 'Interior wear throughout'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '1C6SRFFT3KN567890';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'One-owner Yukon. Max tow package. 3rd row intact.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Onyx black with no blemishes. Running boards work.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Three rows excellent. Entertainment screens work.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Max tow hardware present. Tires 80%.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '1GKS2BKC4NR678901';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Lexus RX350 AWD Premium Plus. Mark Levinson audio.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Eminent white pearl. No chips.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Mark Levinson audio incredible.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Regular Lexus maintenance. Tires 65%.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '2T2BZMCA8MC789012';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Nearly new Highlander. 8-passenger.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Midnight black metallic spotless.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'All 8 seats excellent.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Only 12.8k miles. Factory warranty active.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '5TDHZRBH4PS890123';

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'AWD Pilot. Heated leather. Minor rear bumper scuff.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Minor scuff rear bumper. Body otherwise solid.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Heated leather seats functional.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'AWD functional. Tires 60%.',
  known_issues = ARRAY['Minor rear bumper scuff'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '5FNYF6H57LB901234';

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'Turbocharged CX-5. Bose audio. One windshield chip.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'good',
  exterior_notes = 'Soul red crystal stunning. One chip on windshield (repairable).',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Bose audio perfect.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Turbo pulls strong. Tires 70%.',
  known_issues = ARRAY['Single chip on windshield (~$100 to repair)'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = 'JM3KFBCM6N0012345';

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'Manual Jetta with new clutch. Light wear at 62k.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Platinum gray good. Minor chips on front edge.',
  seat_condition = 'fair', carpet_condition = 'good',
  interior_notes = 'Driver seat wear from manual driving. Shifter knob worn.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'New clutch at 55k. Tires 55%.',
  known_issues = ARRAY['Driver seat wear', 'Minor hood chips', 'Shifter knob worn'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '3VWC57BU3KM123456';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Low-mile Mustang with performance package.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Grabber yellow turns heads. No chips.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Performance seats excellent.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = '6-speed performance. Tires at 70%.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '1FA6P8TH3M5234567';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'AWD Equinox with remote start. No accidents.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Mosaic black clean.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Heated seats work. Remote start tested.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'AWD solid. Tires 75%.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '2GNAXUEV0N6345678';

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'EyeSight Forester. Needs rear brakes.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'excellent',
  exterior_notes = 'Crystal black good. Minor chips on hood.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Panoramic sunroof works perfectly.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'Needs rear brake pads (at 15%). EyeSight functional.',
  known_issues = ARRAY['Rear brake pads need replacement soon'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = 'JF2SKAEC6LH456789';

UPDATE public.listings SET
  overall_grade = 'fair', overall_notes = 'AWD Sportage with accident on record. Mechanically fine.',
  paint_condition = 'good', body_condition = 'good', glass_condition = 'good',
  exterior_notes = 'Rear-end incident repaired. Panels aligned.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'No airbag deployment. Interior intact.',
  engine_condition = 'good', transmission_condition = 'good',
  mechanical_notes = 'AWD functional. Brakes 60%.',
  known_issues = ARRAY['Rear-end accident on record', 'Repaired professionally'],
  has_accident_history = true, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = 'KNDPMCAC8M7567890';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'Hybrid AWD Tucson. Nearly new. Wireless CarPlay.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Shimmering silver spotless.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Wireless CarPlay connects instantly.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = 'Hybrid system healthy. Only 15.6k miles.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '5NMJB3AE0PH678901';

UPDATE public.listings SET
  overall_grade = 'good', overall_notes = 'TorRed Charger. Rear tires at 30%.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'good',
  exterior_notes = 'TorRed paint excellent.',
  seat_condition = 'good', carpet_condition = 'good',
  interior_notes = 'Sport interior good. Slight wear on driver bolster.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = '3.6L V6 smooth. Rear tires at 30%.',
  known_issues = ARRAY['Rear tires at 30% — need replacement soon'],
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '2C3CDXBG5LH789012';

UPDATE public.listings SET
  overall_grade = 'excellent', overall_notes = 'TRD off-road Tacoma 4x4. Low miles.',
  paint_condition = 'excellent', body_condition = 'excellent', glass_condition = 'excellent',
  exterior_notes = 'Cement gray clean. TRD skid plates present.',
  seat_condition = 'excellent', carpet_condition = 'excellent',
  interior_notes = 'Double cab minimal wear. TRD mats protect carpet.',
  engine_condition = 'excellent', transmission_condition = 'excellent',
  mechanical_notes = '4x4 both ranges functional. Tires 70%.',
  known_issues = '{}',
  has_accident_history = false, has_flood_damage = false, has_frame_damage = false, has_rebuilt_title = false
WHERE vin = '5TFCZ5AN3NX890123';
