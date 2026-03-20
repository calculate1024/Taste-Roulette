import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { searchTracks as spotifySearch, ensureTrackCached } from '../services/spotify';
import { curatorFallback } from '../services/matching';
import { getTodayStartUTC8 } from '../utils/date';
import { trackEvent } from '../utils/analytics';

const router = Router();

// GET /api/recommend/search?q=query — hybrid search: local DB first, Spotify fallback
router.get('/search', async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'q query param required' });
    return;
  }

  try {
    // 1. Search local DB first (cached tracks — no API limit)
    const { data: localResults } = await supabaseAdmin
      .from('tracks')
      .select('spotify_id, title, artist, album, cover_url, genres')
      .or(`title.ilike.%${q}%,artist.ilike.%${q}%`)
      .limit(20);

    if (localResults && localResults.length >= 5) {
      res.json({ tracks: localResults, source: 'local' });
      return;
    }

    // 2. Fallback to Spotify API (may fail for non-whitelisted users in Dev Mode)
    try {
      const spotifyResults = await spotifySearch(q, 20);
      const tracks = spotifyResults.map((t) => ({
        spotify_id: t.spotify_id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        cover_url: t.cover_url,
        spotify_url: t.spotify_url,
      }));

      // Merge: local results first, then Spotify (deduplicated)
      const localIds = new Set((localResults || []).map((t) => t.spotify_id));
      const merged = [
        ...(localResults || []),
        ...tracks.filter((t) => !localIds.has(t.spotify_id)),
      ].slice(0, 20);

      res.json({ tracks: merged, source: 'hybrid' });
    } catch {
      // Spotify failed (rate limit / Dev Mode) — return local results only
      res.json({ tracks: localResults || [], source: 'local' });
    }
  } catch {
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

// GET /api/recommend/my-discoveries — tracks the user has received and reacted to
router.get('/my-discoveries', async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    // Get cards the user opened + gave positive feedback on
    const { data: cards } = await supabaseAdmin
      .from('roulette_cards')
      .select(`
        track_id,
        taste_distance,
        recommender_taste_label,
        feedbacks!inner(reaction)
      `)
      .eq('recipient_id', userId)
      .in('status', ['feedback_given', 'opened'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!cards || cards.length === 0) {
      res.json({ tracks: [] });
      return;
    }

    // Get track details
    const trackIds = cards.map((c) => c.track_id);
    const { data: tracks } = await supabaseAdmin
      .from('tracks')
      .select('spotify_id, title, artist, album, cover_url, genres')
      .in('spotify_id', trackIds);

    // Merge card metadata with track details, prioritize surprised reactions
    const trackMap = new Map((tracks || []).map((t) => [t.spotify_id, t]));
    const discoveries = cards
      .filter((c) => trackMap.has(c.track_id))
      .map((c) => {
        const track = trackMap.get(c.track_id)!;
        const feedback = Array.isArray(c.feedbacks) ? c.feedbacks[0] : c.feedbacks;
        return {
          ...track,
          reaction: feedback?.reaction || 'okay',
          taste_distance: c.taste_distance,
          recommender_taste_label: c.recommender_taste_label,
        };
      })
      // Sort: surprised first, then okay
      .sort((a, b) => {
        const order = { surprised: 0, okay: 1, not_for_me: 2 };
        return (order[a.reaction as keyof typeof order] ?? 1) - (order[b.reaction as keyof typeof order] ?? 1);
      });

    res.json({ tracks: discoveries });
  } catch {
    res.status(500).json({ error: 'Failed to fetch discoveries' });
  }
});

// POST /api/recommend/submit — submit a recommendation
router.post('/submit', async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { track_id, reason } = req.body;

  if (!track_id || !reason) {
    res.status(400).json({ error: 'track_id and reason required' });
    return;
  }

  // Ensure track is cached in DB (fetches from Spotify if needed)
  await ensureTrackCached(track_id);

  // Insert user recommendation
  const { error } = await supabaseAdmin
    .from('user_recommendations')
    .insert({
      user_id: userId,
      track_id,
      reason,
    });

  if (error) {
    res.status(500).json({ error: 'Failed to submit recommendation' });
    return;
  }

  // Grant a bonus card as incentive for recommending back
  let bonusCard: { id: string; track_id: string } | undefined;
  try {
    const fallback = await curatorFallback(userId);
    if (fallback) {
      const { data: card } = await supabaseAdmin
        .from('roulette_cards')
        .insert({
          recipient_id: userId,
          recommender_id: null,
          track_id: fallback.trackId,
          reason: fallback.reason,
          taste_distance: fallback.tasteDistance,
          recommender_taste_label: fallback.tasteLabel,
          status: 'pending',
        })
        .select('id, track_id')
        .single();
      if (card) bonusCard = { id: card.id, track_id: card.track_id };
    }
  } catch {
    // Bonus card is best-effort; don't fail the recommendation
  }

  trackEvent(userId, 'recommend_submitted', { bonus_card_issued: !!bonusCard });

  res.json({ ok: true, bonus_card: bonusCard });
});

// GET /api/recommend/prompt — check if user should be prompted to recommend back
router.get('/prompt', async (req: Request, res: Response) => {
  const userId = req.userId!;

  const todayStart = getTodayStartUTC8();

  // Check if user gave feedback today
  const { data: todayFeedback } = await supabaseAdmin
    .from('feedbacks')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString())
    .limit(1);

  const gaveFeedback = todayFeedback && todayFeedback.length > 0;

  // Check if user already recommended today
  const { data: todayRec } = await supabaseAdmin
    .from('user_recommendations')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString())
    .limit(1);

  const alreadyRecommended = todayRec && todayRec.length > 0;

  const shouldPrompt = gaveFeedback && !alreadyRecommended;

  res.json({
    should_prompt: shouldPrompt,
    message: shouldPrompt
      ? 'Your turn! Recommend a track to a stranger.'
      : alreadyRecommended
        ? 'You already recommended today. Come back tomorrow!'
        : 'Listen to today\'s card first, then you can recommend back.',
  });
});

export default router;
