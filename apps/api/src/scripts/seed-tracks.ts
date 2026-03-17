// Seed onboarding tracks with real Spotify metadata + manual genres
// Usage: npx tsx src/scripts/seed-tracks.ts

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { getTrack } from '../services/spotify';
import { supabaseAdmin } from '../services/supabase';

// Track IDs verified to work + manual genre tags
// (Spotify dev-mode apps can't access artist genres or batch endpoints)
const SEED_TRACKS: { id: string; genres: string[] }[] = [
  { id: '4u7EnebtmKWzUH433cf5Qv', genres: ['rock'] },           // Bohemian Rhapsody - Queen
  { id: '0VjIjW4GlUZAMYd2vXMi3b', genres: ['pop', 'r&b'] },     // Blinding Lights - The Weeknd
  { id: '1YQWosTIljIvxAgHWTp7KP', genres: ['jazz'] },            // Take Five - Dave Brubeck
  { id: '6c9EGVj5CaOeoKd9ecMW1U', genres: ['electronic'] },      // Strobe - deadmau5
  { id: '6Er8Fz6fuZNi5cvwQjv1ya', genres: ['classical'] },       // Clair de Lune - Debussy
  { id: '5Z01UMMf7V1o0MzF86s6WJ', genres: ['hip-hop'] },         // Lose Yourself - Eminem
  { id: '6habFhsOp2NvshLv26DqMb', genres: ['latin'] },           // Despacito - Luis Fonsi
  { id: '4i8xlL0EqaSj9piUVUOQQO', genres: ['country', 'pop'] },  // Jolene ft. Dolly Parton
  { id: '1h2xVEoJORqrg71HocgqXd', genres: ['soul', 'funk'] },    // Superstition - Stevie Wonder
  { id: '03UrZgTINDqvnUMbbIMhql', genres: ['k-pop', 'pop'] },    // Gangnam Style - PSY
  { id: '2MuWTIM3b0YEAskbeeFE1i', genres: ['metal'] },           // Master of Puppets - Metallica
  { id: '3B3eOgLJSqPEA0RfboIQVM', genres: ['indie', 'folk'] },   // Skinny Love - Bon Iver
  { id: '6kkwzB6hXLIONkEk9JciA6', genres: ['ambient'] },         // Weightless - Marconi Union
  { id: '04TshWXkhV1qkqHzf31Hn6', genres: ['j-pop'] },           // Lemon - Kenshi Yonezu
  { id: '3PQLYVskjUeRmRIfECsL0X', genres: ['reggae'] },          // No Woman No Cry - Bob Marley
];

async function seed() {
  console.log(`Fetching ${SEED_TRACKS.length} tracks from Spotify...`);

  const rows = [];
  for (const { id, genres } of SEED_TRACKS) {
    try {
      const track = await getTrack(id);
      rows.push({
        spotify_id: track.spotify_id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        cover_url: track.cover_url,
        spotify_url: track.spotify_url,
        artist_id: track.artist_id,
        genres,
        popularity: track.popularity,
        updated_at: new Date().toISOString(),
      });
      console.log(`  OK: ${track.artist} — ${track.title}`);
    } catch (err: any) {
      console.warn(`  SKIP: ${id} — ${err.message}`);
    }
  }

  console.log(`\nUpserting ${rows.length} tracks to Supabase...`);
  const { error } = await supabaseAdmin
    .from('tracks')
    .upsert(rows, { onConflict: 'spotify_id' });

  if (error) {
    console.error('Upsert failed:', error.message);
    process.exit(1);
  }

  console.log(`Done! Seeded ${rows.length} tracks.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
