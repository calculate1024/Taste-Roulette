-- Referral program: users can invite friends via unique codes
-- Referrer gets 3 bonus cards per successful referral
-- Referred user gets 2 cards on first day (instead of 1)

CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast code lookup during redemption
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

-- Index for counting a user's referrals
CREATE INDEX idx_referral_codes_referrer ON referral_codes(referrer_id);

-- Track referral source on profiles for analytics
ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- RLS policies
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral codes
CREATE POLICY referral_codes_select ON referral_codes
  FOR SELECT USING (auth.uid() = referrer_id);

-- Users can insert their own referral codes
CREATE POLICY referral_codes_insert ON referral_codes
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);
