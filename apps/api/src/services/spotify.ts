// Spotify Web API client using Client Credentials flow

interface SpotifyToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: SpotifyToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status} ${await res.text()}`);
  }

  const data: any = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.access_token;
}

async function spotifyFetch(endpoint: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export interface SpotifyTrack {
  spotify_id: string;
  title: string;
  artist: string;
  artist_id: string;
  album: string;
  cover_url: string;
  spotify_url: string;
  popularity: number;
}

function mapTrack(track: any): SpotifyTrack {
  return {
    spotify_id: track.id,
    title: track.name,
    artist: track.artists[0]?.name ?? 'Unknown',
    artist_id: track.artists[0]?.id ?? '',
    album: track.album?.name ?? '',
    cover_url: track.album?.images?.[0]?.url ?? '',
    spotify_url: track.external_urls?.spotify ?? '',
    popularity: track.popularity ?? 0,
  };
}

// Get a single track by Spotify ID
export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  const data = await spotifyFetch(`/tracks/${trackId}`);
  return mapTrack(data);
}

// Get multiple tracks by fetching one by one (batch endpoint restricted in dev mode)
export async function getTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
  const results: SpotifyTrack[] = [];
  for (const id of trackIds) {
    try {
      const track = await getTrack(id);
      results.push(track);
    } catch (err) {
      console.warn(`Failed to fetch track ${id}:`, err);
    }
  }
  return results;
}

// Get artist details including genres
export async function getArtist(artistId: string): Promise<{ id: string; genres: string[] }> {
  const data = await spotifyFetch(`/artists/${artistId}`);
  return { id: data.id, genres: data.genres ?? [] };
}

// Get genres for multiple artists (one by one)
export async function getArtistGenres(artistIds: string[]): Promise<Map<string, string[]>> {
  const genreMap = new Map<string, string[]>();
  for (const id of artistIds) {
    try {
      const artist = await getArtist(id);
      genreMap.set(artist.id, artist.genres);
    } catch (err) {
      console.warn(`Failed to fetch artist ${id}:`, err);
    }
  }
  return genreMap;
}

// Search tracks
export async function searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
  const encoded = encodeURIComponent(query);
  const data = await spotifyFetch(`/search?q=${encoded}&type=track&limit=${limit}`);
  return data.tracks.items.map(mapTrack);
}

// ========== Track caching ==========

import { supabaseAdmin } from './supabase';

/**
 * Ensure a track is cached in the tracks table.
 * Fetches from Spotify if not already present.
 */
export async function ensureTrackCached(trackId: string): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id')
    .eq('spotify_id', trackId)
    .maybeSingle();

  if (existing) return;

  try {
    const track = await getTrack(trackId);
    await supabaseAdmin.from('tracks').upsert({
      spotify_id: track.spotify_id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover_url: track.cover_url,
      spotify_url: track.spotify_url,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'spotify_id' });
  } catch (err) {
    console.warn('Failed to fetch/cache track from Spotify:', err);
  }
}

// ========== OAuth Authorization Code Flow ==========

const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Generate Spotify authorization URL for user OAuth.
 * Scopes: user-top-read, user-read-recently-played, user-library-read
 */
export function getAuthUrl(userId: string, redirectUri: string): string {
  const scopes = 'user-top-read user-read-recently-played user-library-read';
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    state: userId,
    show_dialog: 'true',
  });
  return `${SPOTIFY_AUTH_BASE}/authorize?${params}`;
}

/**
 * Exchange authorization code for access and refresh tokens.
 */
export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string }> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Spotify token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data: any = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

/**
 * Refresh an access token using a stored refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Spotify token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data: any = await res.json();
  return data.access_token;
}

/**
 * Fetch the authenticated user's top tracks.
 */
export async function getUserTopTracks(
  accessToken: string,
  timeRange = 'medium_term',
  limit = 50
): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `${SPOTIFY_API_BASE}/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Spotify top tracks failed: ${res.status} ${await res.text()}`);
  }

  const data: any = await res.json();
  return data.items.map(mapTrack);
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
}

/**
 * Fetch the authenticated user's top artists.
 */
export async function getUserTopArtists(
  accessToken: string,
  timeRange = 'medium_term',
  limit = 50
): Promise<SpotifyArtist[]> {
  const res = await fetch(
    `${SPOTIFY_API_BASE}/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Spotify top artists failed: ${res.status} ${await res.text()}`);
  }

  const data: any = await res.json();
  return data.items.map((a: any) => ({
    id: a.id,
    name: a.name,
    genres: a.genres ?? [],
    popularity: a.popularity ?? 0,
  }));
}

/**
 * Fetch the authenticated Spotify user's profile.
 */
export async function getSpotifyProfile(
  accessToken: string
): Promise<{ id: string; display_name: string | null; email: string | null }> {
  const res = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify profile fetch failed: ${res.status} ${await res.text()}`);
  }

  const data: any = await res.json();
  return {
    id: data.id,
    display_name: data.display_name ?? null,
    email: data.email ?? null,
  };
}
