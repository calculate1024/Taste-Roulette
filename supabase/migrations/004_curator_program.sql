-- Curator Program: adds curator roles, invite codes, and recommendation priority

-- Add curator columns to profiles
ALTER TABLE profiles ADD COLUMN is_curator BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN curator_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN curator_weight FLOAT8 DEFAULT 1.5;

-- Add curator flag to user_recommendations for priority matching
ALTER TABLE user_recommendations ADD COLUMN is_curator_pick BOOLEAN DEFAULT FALSE;

-- Curator invite codes
CREATE TABLE curator_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_curator_invites_code ON curator_invites(code);
CREATE INDEX idx_user_recommendations_curator ON user_recommendations(is_curator_pick) WHERE is_curator_pick = TRUE;

-- Enable RLS
ALTER TABLE curator_invites ENABLE ROW LEVEL SECURITY;

-- Curators can see their own invites
CREATE POLICY "Curators can view own invites"
  ON curator_invites FOR SELECT
  USING (created_by = auth.uid());

-- Curators can insert invites
CREATE POLICY "Curators can create invites"
  ON curator_invites FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Allow update on curator_invites (for redeeming)
-- Note: redeem is done via service key (supabaseAdmin), so RLS is bypassed
