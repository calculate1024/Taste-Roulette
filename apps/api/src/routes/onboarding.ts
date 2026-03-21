import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { computeTasteVector, curatorFallback } from '../services/matching';
import { refreshAccessToken, getUserTopTracks, ensureTrackCached } from '../services/spotify';
import { trackEvent } from '../utils/analytics';

const router = Router();

// Curated onboarding tracks — high-recognition songs covering all genre dimensions.
// Selected for: global recognition, genre diversity, clear genre signal.
// Target: Western/English-speaking market should recognize 70%+.
// IDs verified against actual Supabase tracks table
const CURATED_ONBOARDING_IDS = [
  // Pop/R&B
  '0VjIjW4GlUZAMYd2vXMi3b', // Blinding Lights — The Weeknd
  '7qiZfU4dY1lWllzX7mPBI3', // Shape of You — Ed Sheeran
  // Rock
  '4CeeEOM32jQcH3eN9Q2dGj', // Smells Like Teen Spirit — Nirvana
  '5CQ30WqJwcep0pYcV4AMNc', // Stairway to Heaven — Led Zeppelin
  // Hip-Hop
  '5Z01UMMf7V1o0MzF86s6WJ', // Lose Yourself — Eminem
  '3iVcZ5G6tvkXZkZKlMpIUs', // Alright — Kendrick Lamar
  // Electronic
  '2Foc5Q5nqNiosCNqttzHof', // Get Lucky — Daft Punk
  '2374M0fQpWi3dLnB54qaLX', // Africa — Toto
  // Jazz/Classical
  '1YQWosTIljIvxAgHWTp7KP', // Take Five — Dave Brubeck
  '6Er8Fz6fuZNi5cvwQjv1ya', // Clair de Lune — Debussy
  // Latin/Reggae
  '6rPO02ozF3bM7NnOV4h6s2', // Despacito — Luis Fonsi
  '6JRLFiX9NJSoRRKxowlBYr', // Is This Love — Bob Marley
  // Folk/Country
  '3KkXRkHbMCARz0aVfEt68P', // Sunflower — Post Malone
  '1YYhDizHx7PnDhAhko6cDS', // Take Me Home, Country Roads — John Denver
  // Indie/Alternative
  '003vvx7Niy0yvhvHt4a68B', // Mr. Brightside — The Killers
  '1qDrWA6lyx8cLECdZE7TV7', // Somebody That I Used To Know — Gotye
  // K-Pop
  '5QDLhrAOJJdNAmCTJ8xMyW', // Dynamite — BTS
  '2Fxmhks0bxGSBdJ92vM42m', // bad guy — Billie Eilish
  // World
  '63Tl9k1sH8tznn3bqoMuyF', // Waka Waka — Shakira
  '2YpeDb67231RjR0MgVLzsG', // Old Town Road — Lil Nas X
];

// GET /api/onboarding/tracks — curated high-recognition tracks for onboarding
router.get('/tracks', async (_req: Request, res: Response) => {
  // First try curated list
  const { data: curated, error: curatedError } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id, title, artist, album, cover_url, spotify_url, genres')
    .in('spotify_id', CURATED_ONBOARDING_IDS);

  if (!curatedError && curated && curated.length >= 15) {
    // Shuffle and return 20 (or however many we have)
    const shuffled = curated.sort(() => Math.random() - 0.5).slice(0, 20);
    res.json({ tracks: shuffled });
    return;
  }

  // Fallback: if curated tracks not in DB, use genre-balanced random selection
  const { data, error } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id, title, artist, album, cover_url, spotify_url, genres')
    .limit(200);

  if (error) {
    res.status(500).json({ error: 'Failed to fetch onboarding tracks' });
    return;
  }

  // Pick 1-2 tracks per genre for diversity
  const genreGroups = new Map<string, typeof data>();
  for (const track of data || []) {
    const genre = (track.genres as string[])?.[0] || 'unknown';
    if (!genreGroups.has(genre)) genreGroups.set(genre, []);
    genreGroups.get(genre)!.push(track);
  }

  const selected: typeof data = [];
  for (const [, tracks] of genreGroups) {
    const shuffled = tracks.sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, 2));
  }

  // Shuffle and limit to 20
  const result = selected.sort(() => Math.random() - 0.5).slice(0, 20);
  res.json({ tracks: result });
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
