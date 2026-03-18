-- Add recommender taste label to roulette cards for progressive reveal UI
ALTER TABLE roulette_cards ADD COLUMN recommender_taste_label TEXT;
