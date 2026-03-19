import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { curatorFallback } from '../services/matching';
import { generateCode } from '../utils/code';
import { trackEvent } from '../utils/analytics';

const router = Router();

const REFERRER_BONUS_CARDS = 3;
const REFERRED_BONUS_CARDS = 2;

// POST /api/referral/generate — generate a referral code for the current user
router.post('/generate', async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Check if user already has an unused referral code
  const { data: existing } = await supabaseAdmin
    .from('referral_codes')
    .select('code')
    .eq('referrer_id', userId)
    .is('referred_user_id', null)
    .limit(1)
    .maybeSingle();

  if (existing) {
    res.json({ code: existing.code });
    return;
  }

  // Generate a new code
  const code = generateCode(8);
  const { error } = await supabaseAdmin
    .from('referral_codes')
    .insert({ code, referrer_id: userId });

  if (error) {
    res.status(500).json({ error: 'Failed to generate referral code' });
    return;
  }

  res.json({ code });
});

// GET /api/referral/me — get user's referral stats
router.get('/me', async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Get active (unused) code
  const { data: activeCode } = await supabaseAdmin
    .from('referral_codes')
    .select('code')
    .eq('referrer_id', userId)
    .is('referred_user_id', null)
    .limit(1)
    .maybeSingle();

  // Count successful referrals
  const { count: totalReferrals } = await supabaseAdmin
    .from('referral_codes')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .not('referred_user_id', 'is', null);

  res.json({
    code: activeCode?.code ?? null,
    total_referrals: totalReferrals ?? 0,
  });
});

// POST /api/referral/redeem — redeem a referral code during onboarding
router.post('/redeem', async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Referral code is required' });
    return;
  }

  // Find the referral code
  const { data: referral, error: findError } = await supabaseAdmin
    .from('referral_codes')
    .select('id, referrer_id, referred_user_id')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle();

  if (findError || !referral) {
    res.status(404).json({ error: 'Invalid referral code' });
    return;
  }

  if (referral.referred_user_id) {
    res.status(409).json({ error: 'This code has already been used' });
    return;
  }

  if (referral.referrer_id === userId) {
    res.status(400).json({ error: 'You cannot use your own referral code' });
    return;
  }

  // Mark code as redeemed
  const { error: redeemError } = await supabaseAdmin
    .from('referral_codes')
    .update({ referred_user_id: userId, redeemed_at: new Date().toISOString() })
    .eq('id', referral.id);

  if (redeemError) {
    res.status(500).json({ error: 'Failed to redeem code' });
    return;
  }

  // Update referred user's profile
  await supabaseAdmin
    .from('profiles')
    .update({ referred_by: referral.referrer_id })
    .eq('id', userId);

  // Grant bonus cards to referrer (best-effort)
  try {
    for (let i = 0; i < REFERRER_BONUS_CARDS; i++) {
      const fallback = await curatorFallback(referral.referrer_id);
      if (fallback) {
        await supabaseAdmin.from('roulette_cards').insert({
          recipient_id: referral.referrer_id,
          recommender_id: null,
          track_id: fallback.trackId,
          reason: fallback.reason,
          taste_distance: fallback.tasteDistance,
          recommender_taste_label: fallback.tasteLabel,
          status: 'pending',
        });
      }
    }
  } catch {
    // Bonus cards are best-effort
  }

  // Grant bonus cards to referred user (best-effort)
  try {
    for (let i = 0; i < REFERRED_BONUS_CARDS; i++) {
      const fallback = await curatorFallback(userId);
      if (fallback) {
        await supabaseAdmin.from('roulette_cards').insert({
          recipient_id: userId,
          recommender_id: null,
          track_id: fallback.trackId,
          reason: fallback.reason,
          taste_distance: fallback.tasteDistance,
          recommender_taste_label: fallback.tasteLabel,
          status: 'pending',
        });
      }
    }
  } catch {
    // Bonus cards are best-effort
  }

  trackEvent(userId, 'referral_redeemed', { referrer_id: referral.referrer_id });
  trackEvent(referral.referrer_id, 'referral_success', { referred_user_id: userId });

  res.json({
    ok: true,
    referrer_bonus_cards: REFERRER_BONUS_CARDS,
    referred_bonus_cards: REFERRED_BONUS_CARDS,
  });
});

export default router;
