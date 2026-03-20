// Large-scale track pool expansion via Spotify + MusicBrainz.
// Target: expand from ~500 to 2500+ tracks with diverse genre coverage.
//
// Strategy:
//   1. Spotify: search by genre keywords, decade, mood, playlist-style queries
//   2. Spotify: fetch "related artists" from existing pool artists for discovery
//   3. MusicBrainz: search popular recordings by genre tag for non-Spotify coverage
//   4. All tracks tagged via Last.fm + MusicBrainz (existing genre-tagger pipeline)
//
// Usage: npx tsx src/scripts/pool-expand.ts
// Estimated runtime: 15-25 min (API rate limits)

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { searchTracks, getArtist, SpotifyTrack } from '../services/spotify';
import { supabaseAdmin } from '../services/supabase';
import { getGenreTags } from '../services/genre-tagger';
import { GENRES } from '../utils/genres';

const TARGET_POOL_SIZE = 2500;
const RATE_LIMIT_MS = 150;       // Spotify: ~600 req/min
const LASTFM_RATE_MS = 250;      // Last.fm: ~300 req/min
const BATCH_UPSERT_SIZE = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Search query templates ──────────────────────────────────────────────
// Diverse queries to avoid getting the same top results from Spotify

const DECADE_QUERIES: Record<string, string[]> = {
  'pop':        ['2020s pop hits', '2010s pop classics', '90s pop', 'indie pop 2024'],
  'rock':       ['classic rock', '2020s rock', 'alternative rock', 'garage rock', 'post-punk revival'],
  'hip-hop':    ['underground hip hop', 'boom bap', 'trap 2023', 'conscious rap', 'lo-fi hip hop'],
  'r&b':        ['90s r&b', 'alternative r&b', 'neo soul 2020s', 'modern r&b'],
  'jazz':       ['modern jazz', 'jazz fusion', 'smooth jazz', 'acid jazz', 'jazz piano'],
  'classical':  ['modern classical', 'minimalist classical', 'neo-classical', 'film score'],
  'electronic': ['deep house', 'techno berlin', 'synthwave', 'IDM', 'ambient electronic', 'drum and bass'],
  'latin':      ['reggaeton 2024', 'latin pop', 'cumbia', 'bossa nova', 'salsa moderna'],
  'country':    ['modern country', 'country rock', 'americana', 'outlaw country'],
  'folk':       ['indie folk', 'folk rock', 'acoustic folk', 'freak folk', 'chamber folk'],
  'metal':      ['progressive metal', 'doom metal', 'metalcore', 'black metal', 'post-metal'],
  'punk':       ['pop punk 2020s', 'post-punk', 'hardcore punk', 'skate punk'],
  'indie':      ['indie rock 2024', 'dream pop', 'shoegaze', 'bedroom pop', 'math rock'],
  'soul':       ['neo soul', 'classic soul', 'northern soul', 'psychedelic soul'],
  'blues':      ['modern blues', 'electric blues', 'delta blues', 'blues rock'],
  'reggae':     ['modern reggae', 'dub', 'dancehall', 'roots reggae'],
  'world':      ['afrobeats', 'afro pop', 'desert blues', 'qawwali', 'fado', 'flamenco'],
  'ambient':    ['ambient music', 'dark ambient', 'space ambient', 'drone music'],
  'k-pop':      ['k-pop 2024', 'k-pop boy group', 'k-pop girl group', 'k-indie'],
  'j-pop':      ['j-pop 2024', 'city pop', 'j-rock', 'visual kei', 'vocaloid'],
  'c-pop':      ['mandopop 2024', 'cantopop', 'chinese indie', 'taiwanese pop'],
};

// Additional artist pool for deeper discovery via "related artists"
const DISCOVERY_ARTISTS: Record<string, string[]> = {
  'pop':        ['Billie Eilish', 'Olivia Rodrigo', 'Harry Styles', 'Lorde', 'Charli XCX'],
  'rock':       ['Radiohead', 'Queens of the Stone Age', 'The Strokes', 'Muse', 'Paramore'],
  'hip-hop':    ['Tyler the Creator', 'JID', 'Little Simz', 'Denzel Curry', 'Earthgang'],
  'r&b':        ['Daniel Caesar', 'H.E.R.', 'Jorja Smith', 'Brent Faiyaz', 'Summer Walker'],
  'jazz':       ['Alfa Mist', 'GoGo Penguin', 'Snarky Puppy', 'Cory Wong', 'Jacob Collier'],
  'electronic': ['Four Tet', 'Caribou', 'Jamie xx', 'Floating Points', 'Moderat'],
  'indie':      ['Alvvays', 'Japanese Breakfast', 'Big Thief', 'Snail Mail', 'boygenius'],
  'folk':       ['Adrianne Lenker', 'Phoebe Bridgers', 'Sufjan Stevens', 'Elliott Smith'],
  'soul':       ['Khruangbin', 'Hiatus Kaiyote', 'Thundercat', 'Lianne La Havas'],
  'world':      ['Mdou Moctar', 'Rosalia', 'Anoushka Shankar', 'Youssou N\'Dour'],
  'metal':      ['Mastodon', 'Opeth', 'Deafheaven', 'Sleep Token', 'Spiritbox'],
  'ambient':    ['Stars of the Lid', 'Grouper', 'Tim Hecker', 'Aphex Twin'],
};

// ─── MusicBrainz search ──────────────────────────────────────────────────

interface MBRecording {
  id: string;
  title: string;
  artist: string;
}

async function searchMusicBrainzByTag(tag: string, limit = 20): Promise<MBRecording[]> {
  const url = `https://musicbrainz.org/ws/2/recording?query=tag:${encodeURIComponent(tag)}&fmt=json&limit=${limit}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TasteRoulette/1.0 (taste-roulette@example.com)' },
  });
  if (!res.ok) return [];
  const data: any = await res.json();
  return (data.recordings || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    artist: r['artist-credit']?.[0]?.name || 'Unknown',
  }));
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Track Pool Expansion ===\n');

  // Load existing tracks
  const { data: existingRows } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id');

  const existingIds = new Set((existingRows ?? []).map((r: any) => r.spotify_id));
  console.log(`Existing tracks: ${existingIds.size}`);
  console.log(`Target: ${TARGET_POOL_SIZE}`);
  const needed = TARGET_POOL_SIZE - existingIds.size;
  if (needed <= 0) {
    console.log('Pool already at target size. Done.');
    return;
  }
  console.log(`Need to add: ~${needed} tracks\n`);

  let totalInserted = 0;
  const genreStats: Record<string, number> = {};

  // ─── Phase 1: Spotify genre + decade queries ───────────────────────
  console.log('--- Phase 1: Spotify keyword searches ---\n');

  for (const genre of GENRES) {
    const queries = DECADE_QUERIES[genre] || [`${genre} music`];
    let genreInserted = 0;

    for (const query of queries) {
      if (totalInserted >= needed) break;

      try {
        const tracks = await searchTracks(query, 20);
        const newTracks = tracks.filter((t) => !existingIds.has(t.spotify_id));
        const batch = await tagAndPrepare(newTracks, genre);

        if (batch.length > 0) {
          const { error } = await supabaseAdmin.from('tracks').upsert(batch, { onConflict: 'spotify_id' });
          if (!error) {
            batch.forEach((t) => existingIds.add(t.spotify_id));
            totalInserted += batch.length;
            genreInserted += batch.length;
          }
        }
      } catch (err: any) {
        // Skip failed queries silently
      }
      await sleep(RATE_LIMIT_MS);
    }

    genreStats[genre] = (genreStats[genre] || 0) + genreInserted;
    if (genreInserted > 0) {
      console.log(`  [${genre.padEnd(12)}] +${genreInserted} tracks`);
    }
  }
  console.log(`\nPhase 1 total: +${totalInserted} tracks\n`);

  // ─── Phase 2: Spotify related artists discovery ────────────────────
  console.log('--- Phase 2: Related artist discovery ---\n');

  let phase2 = 0;
  for (const [genre, artists] of Object.entries(DISCOVERY_ARTISTS)) {
    if (totalInserted >= needed) break;

    for (const artistName of artists) {
      if (totalInserted >= needed) break;

      try {
        // Search for the artist to get their ID
        const searchResults = await searchTracks(artistName, 5);
        if (searchResults.length === 0) continue;

        const artistId = searchResults[0].artist_id;
        if (!artistId) continue;

        // Get related artists
        const relatedData = await spotifyFetchRaw(`/artists/${artistId}/related-artists`);
        const relatedArtists = (relatedData?.artists || []).slice(0, 5);

        for (const related of relatedArtists) {
          if (totalInserted >= needed) break;

          try {
            // Get top tracks of related artist
            const topData = await spotifyFetchRaw(`/artists/${related.id}/top-tracks?market=US`);
            const topTracks = (topData?.tracks || []).slice(0, 3).map(mapTrackRaw);
            const newTracks = topTracks.filter((t) => !existingIds.has(t.spotify_id));
            const batch = await tagAndPrepare(newTracks, genre);

            if (batch.length > 0) {
              const { error } = await supabaseAdmin.from('tracks').upsert(batch, { onConflict: 'spotify_id' });
              if (!error) {
                batch.forEach((t) => existingIds.add(t.spotify_id));
                totalInserted += batch.length;
                phase2 += batch.length;
                genreStats[genre] = (genreStats[genre] || 0) + batch.length;
              }
            }
          } catch { /* skip */ }
          await sleep(RATE_LIMIT_MS);
        }
      } catch { /* skip */ }
      await sleep(RATE_LIMIT_MS);
    }
  }
  console.log(`Phase 2 total: +${phase2} tracks\n`);

  // ─── Phase 3: MusicBrainz tag search for diversity ─────────────────
  console.log('--- Phase 3: MusicBrainz tag search ---\n');

  let phase3 = 0;
  const mbTags = [
    'afrobeats', 'shoegaze', 'post-rock', 'dream pop', 'trip hop',
    'nu jazz', 'folktronica', 'art pop', 'psychedelic', 'grunge',
    'neo-psychedelia', 'krautrock', 'synthpop', 'new wave', 'grime',
    'tropicalia', 'samba', 'highlife', 'soukous', 'mbira',
  ];

  for (const tag of mbTags) {
    if (totalInserted >= needed) break;

    try {
      const recordings = await searchMusicBrainzByTag(tag, 15);

      for (const rec of recordings) {
        if (totalInserted >= needed) break;

        // Try to find this track on Spotify for metadata + cover art
        try {
          const spotifyResults = await searchTracks(`${rec.artist} ${rec.title}`, 1);
          if (spotifyResults.length > 0 && !existingIds.has(spotifyResults[0].spotify_id)) {
            const track = spotifyResults[0];
            const batch = await tagAndPrepare([track], tag);
            if (batch.length > 0) {
              const { error } = await supabaseAdmin.from('tracks').upsert(batch, { onConflict: 'spotify_id' });
              if (!error) {
                existingIds.add(batch[0].spotify_id);
                totalInserted++;
                phase3++;
                // Map MB tag to nearest genre
                const mappedGenre = mapMBTagToGenre(tag);
                genreStats[mappedGenre] = (genreStats[mappedGenre] || 0) + 1;
              }
            }
          }
        } catch { /* skip */ }
        await sleep(RATE_LIMIT_MS);
      }
    } catch { /* skip */ }
    await sleep(1100); // MusicBrainz: 1 req/sec
  }
  console.log(`Phase 3 total: +${phase3} tracks\n`);

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('=== EXPANSION COMPLETE ===\n');
  console.log(`Tracks added:    ${totalInserted}`);
  console.log(`Pool size now:   ${existingIds.size}`);
  console.log(`Target:          ${TARGET_POOL_SIZE}`);
  console.log(`Coverage:        ${((existingIds.size / TARGET_POOL_SIZE) * 100).toFixed(0)}%\n`);

  console.log('Genre breakdown (new tracks):');
  const sorted = Object.entries(genreStats).sort((a, b) => b[1] - a[1]);
  for (const [genre, count] of sorted) {
    console.log(`  ${genre.padEnd(12)} +${count}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Tag tracks via Last.fm/MusicBrainz and prepare DB rows */
async function tagAndPrepare(
  tracks: SpotifyTrack[],
  fallbackGenre: string,
): Promise<any[]> {
  const rows: any[] = [];

  for (const t of tracks) {
    let genres = [fallbackGenre];
    try {
      const tagResult = await getGenreTags(t.artist, t.title, [fallbackGenre]);
      if (tagResult.genres.length > 0) {
        genres = tagResult.genres;
      }
      await sleep(LASTFM_RATE_MS);
    } catch { /* keep fallback */ }

    rows.push({
      spotify_id: t.spotify_id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      cover_url: t.cover_url,
      spotify_url: t.spotify_url,
      artist_id: t.artist_id,
      genres,
      updated_at: new Date().toISOString(),
    });
  }

  return rows;
}

/** Raw Spotify API fetch (for endpoints not in spotify.ts) */
async function spotifyFetchRaw(endpoint: string): Promise<any> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  // Get token (simple, no caching — this script runs infrequently)
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const tokenData: any = await tokenRes.json();

  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!res.ok) throw new Error(`Spotify ${res.status}`);
  return res.json();
}

/** Map raw Spotify track object */
function mapTrackRaw(track: any): SpotifyTrack {
  return {
    spotify_id: track.id,
    title: track.name,
    artist: track.artists?.[0]?.name ?? 'Unknown',
    artist_id: track.artists?.[0]?.id ?? '',
    album: track.album?.name ?? '',
    cover_url: track.album?.images?.[0]?.url ?? '',
    spotify_url: track.external_urls?.spotify ?? '',
    popularity: track.popularity ?? 0,
  };
}

/** Map MusicBrainz tags to our genre taxonomy */
function mapMBTagToGenre(tag: string): string {
  const map: Record<string, string> = {
    'afrobeats': 'world', 'shoegaze': 'indie', 'post-rock': 'rock',
    'dream pop': 'indie', 'trip hop': 'electronic', 'nu jazz': 'jazz',
    'folktronica': 'folk', 'art pop': 'pop', 'psychedelic': 'rock',
    'grunge': 'rock', 'neo-psychedelia': 'rock', 'krautrock': 'electronic',
    'synthpop': 'electronic', 'new wave': 'rock', 'grime': 'hip-hop',
    'tropicalia': 'world', 'samba': 'latin', 'highlife': 'world',
    'soukous': 'world', 'mbira': 'world',
  };
  return map[tag] || 'world';
}

main().catch(console.error);
