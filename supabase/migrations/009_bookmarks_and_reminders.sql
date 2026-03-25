-- Bookmarks: save cards for later listening
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES roulette_cards(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, card_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookmarks"
  ON bookmarks FOR ALL USING (auth.uid() = user_id);

-- Onboarding reminder tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_reminder_sent BOOLEAN DEFAULT FALSE;
