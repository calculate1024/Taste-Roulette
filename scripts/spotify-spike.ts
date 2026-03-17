/**
 * Spotify API Spike
 * Validates: auth flow, search, preview URLs availability, audio features
 *
 * Usage: cd apps/api && npx tsx ../../scripts/spotify-spike.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually to avoid dotenv dependency
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim();
    if (val) process.env[key] = val;
  }
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env');
  process.exit(1);
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function searchTracks(token: string, query: string, limit = 10) {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

async function getAudioFeatures(token: string, trackIds: string[]) {
  const res = await fetch(
    `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    console.warn(`Audio features API: ${res.status} — ${await res.text()}`);
    return null;
  }
  return res.json();
}

async function main() {
  console.log('=== Spotify API Spike ===\n');

  // 1. Auth
  console.log('1. Testing Client Credentials auth...');
  const token = await getAccessToken();
  console.log(`   ✓ Got access token (${token.substring(0, 20)}...)\n`);

  // 2. Search across diverse genres
  const queries = [
    'genre:pop',
    'genre:jazz',
    'genre:electronic',
    'genre:classical',
    'genre:hip-hop',
    'genre:rock',
    'genre:r&b',
    'genre:latin',
  ];

  console.log('2. Testing search + preview URL availability...');
  let totalTracks = 0;
  let withPreview = 0;

  for (const query of queries) {
    const result = await searchTracks(token, query, 10);
    const tracks = result.tracks?.items || [];

    for (const track of tracks) {
      totalTracks++;
      if (track.preview_url) {
        withPreview++;
      }
    }

    const genrePreviewCount = tracks.filter((t: any) => t.preview_url).length;
    console.log(
      `   ${query}: ${genrePreviewCount}/${tracks.length} have preview URLs`
    );
  }

  const previewRate = ((withPreview / totalTracks) * 100).toFixed(1);
  console.log(
    `\n   Summary: ${withPreview}/${totalTracks} tracks have preview URLs (${previewRate}%)`
  );
  console.log(
    `   → ${parseFloat(previewRate) > 50 ? '✓ Preview URLs are viable' : '⚠ Low preview rate — deep link fallback is critical'}\n`
  );

  // 3. Audio features
  console.log('3. Testing audio features API...');
  const sampleSearch = await searchTracks(token, 'Bohemian Rhapsody Queen', 3);
  const sampleIds = sampleSearch.tracks?.items?.map((t: any) => t.id) || [];

  if (sampleIds.length > 0) {
    const features = await getAudioFeatures(token, sampleIds);
    if (features?.audio_features) {
      const first = features.audio_features[0];
      if (first) {
        console.log('   ✓ Audio features available. Sample:');
        console.log(`     danceability: ${first.danceability}`);
        console.log(`     energy: ${first.energy}`);
        console.log(`     valence: ${first.valence}`);
        console.log(`     acousticness: ${first.acousticness}`);
        console.log(`     instrumentalness: ${first.instrumentalness}`);
        console.log(`     tempo: ${first.tempo}`);
      } else {
        console.log('   ⚠ Audio features returned null for sample track');
      }
    } else {
      console.log('   ⚠ Audio features API not available or deprecated');
      console.log('   → May need to use track features from search results instead');
    }
  }

  // 4. Rate limit info
  console.log('\n4. Rate limit check...');
  const testRes = await fetch(
    `https://api.spotify.com/v1/search?q=test&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log(`   Retry-After header: ${testRes.headers.get('retry-after') || 'none'}`);
  console.log(`   Rate-Limit-Limit: ${testRes.headers.get('x-ratelimit-limit') || 'not exposed'}`);

  console.log('\n=== Spike Complete ===');
}

main().catch(console.error);
