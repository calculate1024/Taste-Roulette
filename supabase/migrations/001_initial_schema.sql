-- Taste Roulette initial schema
-- Uses Supabase Auth (auth.users) as the user identity source

-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  taste_vector FLOAT8[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  streak_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Onboarding responses (swipe questionnaire)
CREATE TABLE onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  track_id TEXT NOT NULL,
  reaction TEXT CHECK (reaction IN ('love', 'okay', 'not_for_me')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Roulette cards (daily recommendations)
CREATE TABLE roulette_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recommender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
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
  card_id UUID REFERENCES roulette_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction TEXT CHECK (reaction IN ('surprised', 'okay', 'not_for_me')) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User recommendations (recommend-back pool)
CREATE TABLE user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
  spotify_url TEXT,
  artist_id TEXT,
  genres TEXT[],
  popularity INT,
  mood_tags TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_roulette_cards_recipient ON roulette_cards(recipient_id, status);
CREATE INDEX idx_roulette_cards_delivered ON roulette_cards(delivered_at);
CREATE INDEX idx_user_recommendations_unused ON user_recommendations(used) WHERE used = FALSE;
CREATE INDEX idx_onboarding_responses_user ON onboarding_responses(user_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Onboarding: users can insert/read their own responses
CREATE POLICY "Users can insert own responses"
  ON onboarding_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own responses"
  ON onboarding_responses FOR SELECT USING (auth.uid() = user_id);

-- Roulette cards: users can read cards addressed to them
CREATE POLICY "Recipients can view their cards"
  ON roulette_cards FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Recipients can update their cards"
  ON roulette_cards FOR UPDATE USING (auth.uid() = recipient_id);

-- Feedbacks: users can insert/read their own
CREATE POLICY "Users can insert own feedback"
  ON feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback"
  ON feedbacks FOR SELECT USING (auth.uid() = user_id);

-- User recommendations: users can insert/read their own
CREATE POLICY "Users can insert own recommendations"
  ON user_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own recommendations"
  ON user_recommendations FOR SELECT USING (auth.uid() = user_id);

-- Tracks: readable by all authenticated users
CREATE POLICY "Authenticated users can view tracks"
  ON tracks FOR SELECT USING (auth.role() = 'authenticated');
