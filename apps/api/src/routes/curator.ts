import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { ensureTrackCached } from '../services/spotify';
import { generateCode } from '../utils/code';

const router = Router();

/** Middleware: verify the requesting user is a curator. */
async function requireCurator(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.userId;
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_curator')
    .eq('id', userId)
    .single();

  if (!profile?.is_curator) {
    res.status(403).json({ error: 'Curator access required' });
    return;
  }
  next();
}

// POST /api/curator/redeem — Redeem a curator invite code
router.post('/redeem', async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'code is required' });
    return;
  }

  // Find the unused invite
  const { data: invite, error: findError } = await supabaseAdmin
    .from('curator_invites')
    .select('id, code')
    .eq('code', code.trim().toUpperCase())
    .is('used_by', null)
    .maybeSingle();

  if (findError || !invite) {
    res.status(404).json({ error: 'Invalid or already used invite code' });
    return;
  }

  // Check if user is already a curator
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_curator')
    .eq('id', userId)
    .single();

  if (profile?.is_curator) {
    res.status(400).json({ error: 'You are already a curator' });
    return;
  }

  // Generate a unique curator code for this user
  const curatorCode = generateCode(8);

  // Mark invite as used and promote user to curator
  const { error: updateInviteError } = await supabaseAdmin
    .from('curator_invites')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('id', invite.id);

  if (updateInviteError) {
    res.status(500).json({ error: 'Failed to redeem invite' });
    return;
  }

  const { error: updateProfileError } = await supabaseAdmin
    .from('profiles')
    .update({ is_curator: true, curator_code: curatorCode })
    .eq('id', userId);

  if (updateProfileError) {
    res.status(500).json({ error: 'Failed to update profile' });
    return;
  }

  res.json({ ok: true, curator_code: curatorCode });
});

// GET /api/curator/stats — Get curator's stats (curators only)
router.get('/stats', requireCurator, async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Total recommendations by this curator
  const { count: totalRecommendations } = await supabaseAdmin
    .from('user_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_curator_pick', true);

  // Total used (matched to someone)
  const { count: totalUsed } = await supabaseAdmin
    .from('user_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_curator_pick', true)
    .eq('used', true);

  // Total "surprised" reactions on cards from this curator
  const { data: curatorCards } = await supabaseAdmin
    .from('roulette_cards')
    .select('id')
    .eq('recommender_id', userId);

  let totalSurprised = 0;
  if (curatorCards && curatorCards.length > 0) {
    const cardIds = curatorCards.map((c: any) => c.id);
    const { count } = await supabaseAdmin
      .from('feedbacks')
      .select('id', { count: 'exact', head: true })
      .in('card_id', cardIds)
      .eq('reaction', 'surprised');
    totalSurprised = count || 0;
  }

  // Remaining invite codes (created but unused)
  const { count: inviteCodesRemaining } = await supabaseAdmin
    .from('curator_invites')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .is('used_by', null);

  res.json({
    total_recommendations: totalRecommendations || 0,
    total_used: totalUsed || 0,
    total_surprised: totalSurprised,
    invite_codes_remaining: inviteCodesRemaining || 0,
  });
});

// POST /api/curator/recommend — Curator submits a recommendation (higher priority)
router.post('/recommend', requireCurator, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { track_id, reason } = req.body;

  if (!track_id || !reason) {
    res.status(400).json({ error: 'track_id and reason required' });
    return;
  }

  // Ensure track is cached in DB (fetches from Spotify if needed)
  await ensureTrackCached(track_id);

  // Insert curator recommendation with curator flag
  const { error } = await supabaseAdmin
    .from('user_recommendations')
    .insert({
      user_id: userId,
      track_id,
      reason,
      is_curator_pick: true,
    });

  if (error) {
    res.status(500).json({ error: 'Failed to submit recommendation' });
    return;
  }

  res.json({ ok: true });
});

// POST /api/curator/invite — Generate invite codes (curators only)
router.post('/invite', requireCurator, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { count } = req.body;

  const numCodes = Math.min(Math.max(parseInt(count, 10) || 1, 1), 5);

  const codes: string[] = [];
  for (let i = 0; i < numCodes; i++) {
    codes.push(generateCode(8));
  }

  const rows = codes.map((code) => ({
    code,
    created_by: userId,
  }));

  const { error } = await supabaseAdmin
    .from('curator_invites')
    .insert(rows);

  if (error) {
    res.status(500).json({ error: 'Failed to generate invite codes' });
    return;
  }

  res.json({ codes });
});

// GET /api/curator/recommendations — List curator's own recommendations
router.get('/recommendations', requireCurator, async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Get curator's recommendations with track info
  const { data: recs, error } = await supabaseAdmin
    .from('user_recommendations')
    .select('id, track_id, reason, used, is_curator_pick, created_at')
    .eq('user_id', userId)
    .eq('is_curator_pick', true)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
    return;
  }

  // Enrich with track metadata
  const trackIds = (recs || []).map((r: any) => r.track_id);
  const { data: tracks } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id, title, artist, album, cover_url, spotify_url')
    .in('spotify_id', trackIds.length > 0 ? trackIds : ['__none__']);

  const trackMap: Record<string, any> = {};
  for (const t of tracks || []) {
    trackMap[t.spotify_id] = t;
  }

  // Get feedback counts per recommendation (via roulette_cards)
  const { data: cards } = await supabaseAdmin
    .from('roulette_cards')
    .select('track_id, id')
    .eq('recommender_id', userId);

  const cardIdsByTrack: Record<string, string[]> = {};
  for (const c of cards || []) {
    if (!cardIdsByTrack[c.track_id]) cardIdsByTrack[c.track_id] = [];
    cardIdsByTrack[c.track_id].push(c.id);
  }

  // Get feedback reactions for those cards
  const allCardIds = (cards || []).map((c: any) => c.id);
  const { data: feedbacks } = await supabaseAdmin
    .from('feedbacks')
    .select('card_id, reaction')
    .in('card_id', allCardIds.length > 0 ? allCardIds : ['__none__']);

  const feedbackByCard: Record<string, string> = {};
  for (const f of feedbacks || []) {
    feedbackByCard[f.card_id] = f.reaction;
  }

  const enriched = (recs || []).map((rec: any) => {
    const relatedCardIds = cardIdsByTrack[rec.track_id] || [];
    const reactions = relatedCardIds
      .map((cid) => feedbackByCard[cid])
      .filter(Boolean);

    return {
      id: rec.id,
      track_id: rec.track_id,
      reason: rec.reason,
      used: rec.used,
      created_at: rec.created_at,
      track: trackMap[rec.track_id] || null,
      feedback_received: reactions,
    };
  });

  res.json({ recommendations: enriched });
});

// generateCode moved to ../utils/code.ts

export default router;
