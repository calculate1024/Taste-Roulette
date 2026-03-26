-- Add source URL tracking for harvested recommendations
-- Internal only, never exposed via API
ALTER TABLE user_recommendations ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Index for dedup checking during harvest runs
CREATE INDEX IF NOT EXISTS idx_user_recommendations_source_url
  ON user_recommendations(source_url)
  WHERE source_url IS NOT NULL;
