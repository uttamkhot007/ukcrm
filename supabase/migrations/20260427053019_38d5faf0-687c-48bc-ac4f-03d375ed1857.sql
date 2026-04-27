-- Set password for superadmin uttam.khot@gmail.com
-- Uses pgcrypto's bcrypt to hash 'Sniffer$$2211' to the format Supabase Auth expects
UPDATE auth.users
SET 
  encrypted_password = crypt('Sniffer$$2211', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'uttam.khot@gmail.com';