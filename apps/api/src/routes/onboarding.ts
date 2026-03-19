import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { computeTasteVector, curatorFallback } from '../services/matching';
import { refreshAccessToken, getUserTopTracks, ensureTrackCached } from '../services/spotify';
import { trackEvent } from '../utils/analytics';

const router = Router();

// GET /api/onboarding/tracks — get onboarding tracks from DB
router.get('/tracks', async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id, title, artist, album, cover_url, spotify_url, genres')
    .limit(30); // Fetch extra to allow shuffling

  if (error) {
    res.status(500).json({ error: 'Failed to fetch onboarding tracks' });
    return;
  }

  // Randomize and return a subset
  const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, 15);

  res.json({ tracks: shuffled });
});

// GET /api/onboarding/personal-tracks — get user's Spotify top tracks for onboarding
router.get('/personal-tracks', async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Get user's Spotify refresh token from profiles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('spotify_refresh_token')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.spotify_refresh_token) {
    res.status(400).json({ error: 'Spotify not connected' });
    return;
  }

  try {
    // Refresh access token
    const accessToken = await refreshAccessToken(profile.spotify_refresh_token);

    // Fetch user's top tracks (medium_term, limit 15)
    const topTracks = await getUserTopTracks(accessToken, 'medium_term', 15);

    // Cache tracks in DB (best-effort, don't block response)
    const cachePromises = topTracks.map((t) =>
      ensureTrackCached(t.spotify_id).catch(() => {})
    );
    await Promise.allSettled(cachePromises);

    // Fetch genres from cached tracks to include in response
    const trackIds = topTracks.map((t) => t.spotify_id);
    const { data: cachedTracks } = await supabaseAdmin
      .from('tracks')
      .select('spotify_id, genres')
      .in('spotify_id', trackIds);

    const genreMap = new Map<string, string[]>();
    if (cachedTracks) {
      for (const ct of cachedTracks) {
        genreMap.set(ct.spotify_id, ct.genres || []);
      }
    }

    // Format response like /tracks endpoint
    const tracks = topTracks.map((t) => ({
      spotify_id: t.spotify_id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      cover_url: t.cover_url,
      spotify_url: t.spotify_url,
      genres: genreMap.get(t.spotify_id) || [],
    }));

    res.json({ tracks });
  } catch (err: any) {
    console.error('Failed to fetch personal tracks:', err);
    res.status(500).json({ error: 'Failed to fetch Spotify tracks' });
  }
});

// POST /api/onboarding/responses — submit swipe responses
router.post('/responses', async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { responses } = req.body;

  if (!responses || !Array.isArray(responses)) {
    res.status(400).json({ error: 'responses[] required' });
    return;
  }

  // Validate reaction values
  const validReactions = ['love', 'okay', 'not_for_me'];
  const invalid = responses.find((r: any) => !validReactions.includes(r.reaction));
  if (invalid) {
    res.status(400).json({ error: `Invalid reaction: ${invalid.reaction}` });
    return;
  }

  const rows = responses.map((r: { track_id: string; reaction: string }) => ({
    user_id: userId,
    track_id: r.track_id,
    reaction: r.reaction,
  }));

  const { error } = await supabaseAdmin
    .from('onboarding_responses')
    .insert(rows);

  if (error) {
    res.status(500).json({ error: 'Failed to save onboarding responses' });
    return;
  }

  res.json({ ok: true, count: rows.length });
});

// POST /api/onboarding/complete — mark onboarding as done
router.post('/complete', async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Check idempotency — if already completed, return early
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .single();

  if (existing?.onboarding_completed) {
    res.json({ message: 'Already completed', already_completed: true });
    return;
  }

  // Compute taste vector from onboarding responses
  const tasteVector = await computeTasteVector(userId);

  // Mark onboarding complete and store taste vector
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ onboarding_completed: true, taste_vector: tasteVector })
    .eq('id', userId);

  if (error) {
    res.status(500).json({ error: 'Failed to complete onboarding' });
    return;
  }

  // Immediately issue the user's first card via taste-aware curator fallback
  let firstCard = null;
  const fallback = await curatorFallback(userId);
  if (fallback) {
    const { data: card, error: cardError } = await supabaseAdmin
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
      .select('id')
      .single();

    if (!cardError && card) {
      firstCard = card.id;
    }
  }

  trackEvent(userId, 'onboarding_completed', {
    taste_vector_dims: tasteVector.length,
    first_card_issued: !!firstCard,
  });

  res.json({ ok: true, taste_vector_dims: tasteVector.length, first_card_id: firstCard });
});

export default router;
