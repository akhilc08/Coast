-- Remove directly-inserted dev users that are missing auth.identities entries
-- They will be recreated via the Admin API (seed-users.ts script)

DELETE FROM auth.users
WHERE email IN (
  'admin@drivewithcoast.com',
  'buyer@example.com',
  'seller@example.com'
);
