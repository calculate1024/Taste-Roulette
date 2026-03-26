-- Performance indexes for scaling beyond 100 users

-- Echo queries: find cards by recommender to notify them of reactions
CREATE INDEX IF NOT EXISTS idx_roulette_cards_recommender
  ON roulette_cards(recommender_id, created_at DESC);

-- Surprise count queries: profile stats + badge calculations
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_reaction
  ON feedbacks(user_id, reaction, created_at DESC);

-- Daily notification query: pending cards with recipient lookup
CREATE INDEX IF NOT EXISTS idx_roulette_cards_status_created
  ON roulette_cards(status, created_at DESC)
  WHERE status = 'pending';
