-- Add is_seed flag to profiles for distinguishing AI seed users from real users
ALTER TABLE profiles ADD COLUMN is_seed BOOLEAN DEFAULT FALSE;

-- Mark existing seed users
UPDATE profiles SET is_seed = TRUE WHERE id IN (
  SELECT id FROM auth.users WHERE email LIKE 'seed-%@taste-roulette.local'
);
