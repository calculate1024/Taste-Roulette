import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { searchTracks as spotifySearch, getTrack } from '../services/spotify';
import { getTodayStartUTC8 } from '../utils/date';

const router = Router();

// GET /api/recommend/search?q=query — search Spotify tracks
router.get('/search', async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'q query param required' });
    return;
  }

  try {
    const results = await spotifySearch(q, 20);
    const tracks = results.map((t) => ({
      spotify_id: t.spotify_id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      cover_url: t.cover_url,
      spotify_url: t.spotify_url,
    }));

    res.json({ tracks });
  } catch {
    res.status(500).json({ error: 'Failed to search tracks' });
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

  // Upsert track into tracks table (fetch from Spotify if not cached)
  const { data: existingTrack } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id')
    .eq('spotify_id', track_id)
    .maybeSingle();

  if (!existingTrack) {
    try {
      const spotifyTrack = await getTrack(track_id);
      const { error: upsertError } = await supabaseAdmin
        .from('tracks')
        .upsert({
          spotify_id: spotifyTrack.spotify_id,
          title: spotifyTrack.title,
          artist: spotifyTrack.artist,
          album: spotifyTrack.album,
          cover_url: spotifyTrack.cover_url,
          spotify_url: spotifyTrack.spotify_url,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'spotify_id' });

      if (upsertError) {
        console.warn('Failed to cache track:', upsertError.message);
      }
    } catch (err) {
      console.warn('Failed to fetch track from Spotify:', err);
    }
  }

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

  res.json({ ok: true });
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
