-- Add English reason column for i18n support
ALTER TABLE user_recommendations ADD COLUMN IF NOT EXISTS reason_en TEXT;
ALTER TABLE roulette_cards ADD COLUMN IF NOT EXISTS reason_en TEXT;
