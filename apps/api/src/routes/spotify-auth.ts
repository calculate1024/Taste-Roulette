import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../services/supabase';
import {
  getAuthUrl,
  exchangeCode,
  refreshAccessToken,
  getUserTopTracks,
  getUserTopArtists,
  getSpotifyProfile,
  getArtistGenres,
} from '../services/spotify';
import { computeTasteVector } from '../services/matching';
import { authMiddleware } from '../middleware/auth';
import { VECTOR_DIM, REACTION_WEIGHTS, genreToVector } from '../utils/genres';

const router = Router();

// Simple in-memory state store for OAuth CSRF protection
// Production would use Redis with TTL
const oauthStateStore = new Map<string, { userId: string; expiresAt: number }>();

// Periodically clean expired states (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of oauthStateStore) {
    if (now > value.expiresAt) {
      oauthStateStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

// GET /api/spotify/auth-url — Generate Spotify OAuth authorization URL (protected)
router.get('/auth-url', authMiddleware, (req: Request, res: Response) => {
  const userId = req.userId!;

  // Generate random state token for CSRF protection
  const state = crypto.randomUUID();
  oauthStateStore.set(state, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
  const url = getAuthUrl(state, redirectUri);
  res.json({ url });
});

// GET /api/spotify/callback — Handle Spotify OAuth callback (public — redirect from Spotify)
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error: authError } = req.query;

  if (authError) {
    // User denied access or an error occurred
    res.redirect('taste-roulette://onboarding?spotify=error');
    return;
  }

  if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  // Validate state against stored map (CSRF protection)
  const stateData = oauthStateStore.get(state);
  if (!stateData || Date.now() > stateData.expiresAt) {
    res.status(400).json({ error: 'Invalid or expired OAuth state' });
    return;
  }
  const userId = stateData.userId;
  oauthStateStore.delete(state);

  try {
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;

    // Exchange authorization code for tokens
    const tokens = await exchangeCode(code, redirectUri);

    // Fetch Spotify user profile
    const profile = await getSpotifyProfile(tokens.access_token);

    // Store refresh token and mark as connected
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        spotify_refresh_token: tokens.refresh_token,
        spotify_connected: true,
        spotify_display_name: profile.display_name,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update profile with Spotify data:', updateError);
      res.redirect('taste-roulette://onboarding?spotify=error');
      return;
    }

    // Redirect to app deep link on success
    res.redirect('taste-roulette://onboarding?spotify=connected');
  } catch (err) {
    console.error('Spotify OAuth callback error:', err);
    res.redirect('taste-roulette://onboarding?spotify=error');
  }
});

// POST /api/spotify/import — Import user's Spotify listening data (protected)
router.post('/import', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    // Get stored refresh token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('spotify_refresh_token, spotify_connected')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    if (!profile.spotify_connected || !profile.spotify_refresh_token) {
      res.status(400).json({ error: 'Spotify not connected for this user' });
      return;
    }

    // Get fresh access token
    const accessToken = await refreshAccessToken(profile.spotify_refresh_token);

    // Fetch top tracks and artists in parallel
    const [topTracks, topArtists] = await Promise.all([
      getUserTopTracks(accessToken, 'medium_term', 50),
      getUserTopArtists(accessToken, 'medium_term', 50),
    ]);

    // Collect unique artist IDs from tracks for genre lookup
    const artistIds = [...new Set(topTracks.map((t) => t.artist_id).filter(Boolean))];

    // Fetch genres for all artists
    const genreMap = await getArtistGenres(artistIds);

    // Batch upsert tracks into the tracks table
    const trackRows = topTracks.map((track) => {
      const artistGenres = genreMap.get(track.artist_id) ?? [];
      return {
        spotify_id: track.spotify_id,
        title: track.title,
        artist: track.artist,
        artist_id: track.artist_id,
        album: track.album,
        cover_url: track.cover_url,
        spotify_url: track.spotify_url,
        genres: artistGenres,
        popularity: track.popularity,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabaseAdmin
      .from('tracks')
      .upsert(trackRows, { onConflict: 'spotify_id' });

    const importedTracks = upsertError ? 0 : trackRows.length;
    if (upsertError) {
      console.warn('Batch track upsert failed:', upsertError.message);
    }

    // Recompute taste vector incorporating both onboarding + Spotify data
    const tasteVector = await computeEnrichedTasteVector(userId, topTracks, topArtists, genreMap);

    // Update profile with new taste vector
    await supabaseAdmin
      .from('profiles')
      .update({ taste_vector: tasteVector })
      .eq('id', userId);

    res.json({
      imported_tracks: importedTracks,
      imported_artists: topArtists.length,
      taste_vector_updated: true,
    });
  } catch (err) {
    console.error('Spotify import error:', err);
    res.status(500).json({ error: 'Failed to import Spotify data' });
  }
});

// POST /api/spotify/disconnect — Remove Spotify connection (protected)
router.post('/disconnect', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      spotify_refresh_token: null,
      spotify_connected: false,
      spotify_display_name: null,
    })
    .eq('id', userId);

  if (error) {
    res.status(500).json({ error: 'Failed to disconnect Spotify' });
    return;
  }

  // Recompute taste vector using only onboarding data
  const tasteVector = await computeTasteVector(userId);
  await supabaseAdmin
    .from('profiles')
    .update({ taste_vector: tasteVector })
    .eq('id', userId);

  res.json({ ok: true });
});

export default router;

// ========== Internal helpers ==========

/**
 * Compute enriched taste vector blending onboarding responses + Spotify top data.
 * Onboarding responses use their original weights.
 * Spotify top tracks/artists are treated as implicit "love" signals.
 */
async function computeEnrichedTasteVector(
  userId: string,
  topTracks: { artist_id: string }[],
  topArtists: { genres: string[] }[],
  genreMap: Map<string, string[]>
): Promise<number[]> {
  // 1. Start with onboarding data
  const { data: responses } = await supabaseAdmin
    .from('onboarding_responses')
    .select('track_id, reaction')
    .eq('user_id', userId);

  const { data: tracks } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id, genres');

  const trackGenres: Record<string, string[]> = {};
  for (const t of (tracks || [])) {
    trackGenres[t.spotify_id] = t.genres || [];
  }

  const weightedSum = new Array(VECTOR_DIM).fill(0);
  let weightTotal = 0;

  // Add onboarding responses
  for (const resp of (responses || [])) {
    const weight = REACTION_WEIGHTS[resp.reaction] ?? 0;
    const genres = trackGenres[resp.track_id];
    if (!genres || genres.length === 0) continue;
    const genreVec = genreToVector(genres);
    for (let i = 0; i < VECTOR_DIM; i++) {
      weightedSum[i] += weight * genreVec[i];
    }
    weightTotal += Math.abs(weight);
  }

  // 2. Add Spotify top tracks (implicit "love" with reduced weight)
  const spotifyWeight = 0.6; // Less than explicit "love" from onboarding
  for (const track of topTracks) {
    const genres = genreMap.get(track.artist_id) ?? [];
    if (genres.length === 0) continue;
    const genreVec = genreToVector(genres);
    for (let i = 0; i < VECTOR_DIM; i++) {
      weightedSum[i] += spotifyWeight * genreVec[i];
    }
    weightTotal += spotifyWeight;
  }

  // 3. Add Spotify top artists (direct genre signal)
  const artistWeight = 0.8;
  for (const artist of topArtists) {
    if (artist.genres.length === 0) continue;
    const genreVec = genreToVector(artist.genres);
    for (let i = 0; i < VECTOR_DIM; i++) {
      weightedSum[i] += artistWeight * genreVec[i];
    }
    weightTotal += artistWeight;
  }

  if (weightTotal === 0) {
    return new Array(VECTOR_DIM).fill(0);
  }

  return weightedSum.map((v: number) => v / weightTotal);
}
