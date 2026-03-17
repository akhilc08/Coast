-- Fix roles for dev users whose profiles were created with the wrong role.

UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@drivewithcoast.com');

UPDATE public.profiles
SET role = 'wholesaler',
    company = 'Example Auto Group',
    phone = '(555) 000-1234'
WHERE id = (SELECT id FROM auth.users WHERE email = 'seller@example.com');
