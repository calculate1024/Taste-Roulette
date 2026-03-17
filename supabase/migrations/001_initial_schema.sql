-- Taste Roulette initial schema
-- Run against Supabase PostgreSQL

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  taste_vector FLOAT8[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  streak_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding responses (swipe questionnaire)
CREATE TABLE onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  reaction TEXT CHECK (reaction IN ('love', 'okay', 'not_for_me')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Roulette cards (daily recommendations)
CREATE TABLE roulette_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recommender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  track_id TEXT NOT NULL,
  reason TEXT,
  taste_distance FLOAT8,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'opened', 'feedback_given')),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedbacks
CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES roulette_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT CHECK (reaction IN ('surprised', 'okay', 'not_for_me')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User recommendations (recommend-back pool)
CREATE TABLE user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  reason TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Track metadata cache
CREATE TABLE tracks (
  spotify_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,
  spotify_url TEXT,              -- for deep link / embed: https://open.spotify.com/track/{id}
  artist_id TEXT,                -- Spotify artist ID (for genre lookup)
  genres TEXT[],                 -- from Spotify artist genres
  popularity INT,               -- Spotify track popularity (0-100)
  mood_tags TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_roulette_cards_recipient ON roulette_cards(recipient_id, status);
CREATE INDEX idx_roulette_cards_delivered ON roulette_cards(delivered_at);
CREATE INDEX idx_user_recommendations_unused ON user_recommendations(used) WHERE used = FALSE;
CREATE INDEX idx_onboarding_responses_user ON onboarding_responses(user_id);
