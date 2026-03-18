-- Add c-pop (華語流行) as 21st dimension to taste vectors
-- Existing 20-dim vectors need a 0 appended

-- Update all profiles with existing taste vectors
UPDATE profiles
SET taste_vector = taste_vector || ARRAY[0::float8]
WHERE taste_vector IS NOT NULL
  AND array_length(taste_vector, 1) = 20;
