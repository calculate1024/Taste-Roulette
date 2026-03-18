// Auto-expand tracks table by searching Spotify for tracks in each genre
// Usage: npx tsx src/scripts/seed-expand.ts
//
// NOTE: Spotify API no longer returns the `popularity` field (always undefined).
// We accept all fetched tracks and rely on genre tagging for quality.

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { searchTracks, SpotifyTrack } from '../services/spotify';
import { supabaseAdmin } from '../services/supabase';
import { getGenreTags } from '../services/genre-tagger';
import { GENRES } from '../utils/genres';

const SEARCH_LIMIT = 10;
const RATE_LIMIT_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Artist queries per genre for better discovery
const GENRE_ARTIST_QUERIES: Record<string, string[]> = {
  'pop': ['Taylor Swift', 'Dua Lipa', 'Bruno Mars', 'Ed Sheeran'],
  'rock': ['Foo Fighters', 'Arctic Monkeys', 'Imagine Dragons'],
  'hip-hop': ['Kendrick Lamar', 'Drake', 'J. Cole'],
  'r&b': ['SZA', 'The Weeknd', 'Frank Ocean'],
  'jazz': ['Norah Jones', 'Kamasi Washington', 'Robert Glasper'],
  'classical': ['Ludovico Einaudi', 'Yo-Yo Ma', 'Lang Lang'],
  'electronic': ['Disclosure', 'Bonobo', 'Rufus Du Sol'],
  'latin': ['Bad Bunny', 'Rosalia', 'J Balvin'],
  'country': ['Morgan Wallen', 'Luke Combs', 'Chris Stapleton'],
  'folk': ['Fleet Foxes', 'Iron & Wine', 'Bon Iver'],
  'metal': ['Metallica', 'Gojira', 'Ghost'],
  'punk': ['Green Day', 'Blink-182', 'The Offspring'],
  'indie': ['Tame Impala', 'Mac DeMarco', 'Phoebe Bridgers'],
  'soul': ['Leon Bridges', 'Anderson .Paak', 'Erykah Badu'],
  'blues': ['Gary Clark Jr', 'Joe Bonamassa', 'Buddy Guy'],
  'reggae': ['Bob Marley', 'Chronixx', 'Protoje'],
  'world': ['Burna Boy', 'Tinariwen', 'Bomba Estereo'],
  'ambient': ['Brian Eno', 'Nils Frahm', 'Tycho'],
  'k-pop': ['BTS', 'BLACKPINK', 'NewJeans', 'Stray Kids'],
  'j-pop': ['YOASOBI', 'Kenshi Yonezu', 'Ado'],
  'c-pop': ['Jay Chou', 'JJ Lin', 'Jolin Tsai', 'Mayday'],
};

async function seedExpand() {
  console.log(`Expanding tracks table across ${GENRES.length} genres...\n`);

  // Fetch existing track IDs to skip duplicates
  const { data: existingRows, error: fetchErr } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id');

  if (fetchErr) {
    console.error('Failed to fetch existing tracks:', fetchErr.message);
    process.exit(1);
  }

  const existingIds = new Set((existingRows ?? []).map((r: any) => r.spotify_id));
  console.log(`Found ${existingIds.size} existing tracks in DB.\n`);

  let totalFetched = 0;
  let totalInserted = 0;

  for (const genre of GENRES) {
    try {
      // Strategy 1: genre search
      let tracks = await searchTracks(`genre:${genre}`, SEARCH_LIMIT);

      // Strategy 2: search by known artists for this genre
      const artistQueries = GENRE_ARTIST_QUERIES[genre] ?? [];
      for (const artist of artistQueries) {
        try {
          const artistTracks = await searchTracks(artist, 5);
          tracks = tracks.concat(artistTracks);
          await sleep(RATE_LIMIT_MS);
        } catch { /* skip failed artist search */ }
      }

      // Deduplicate by spotify_id
      const seen = new Set<string>();
      tracks = tracks.filter((t) => {
        if (seen.has(t.spotify_id)) return false;
        seen.add(t.spotify_id);
        return true;
      });

      totalFetched += tracks.length;

      // Filter out already-existing tracks
      const newTracks = tracks.filter((t) => !existingIds.has(t.spotify_id));

      let inserted = 0;
      if (newTracks.length > 0) {
        const rows = [];
        for (const t of newTracks) {
          // Try Last.fm for genre tagging
          let trackGenres = [genre]; // Default to search genre
          try {
            const tagResult = await getGenreTags(t.artist, t.title, [genre]);
            if (tagResult.genres.length > 0) {
              trackGenres = tagResult.genres;
            }
            await sleep(200); // Last.fm rate limit
          } catch {
            // Keep default genre on failure
          }

          rows.push({
            spotify_id: t.spotify_id,
            title: t.title,
            artist: t.artist,
            album: t.album,
            cover_url: t.cover_url,
            spotify_url: t.spotify_url,
            artist_id: t.artist_id,
            genres: trackGenres,
            updated_at: new Date().toISOString(),
          });
        }

        const { error: upsertErr } = await supabaseAdmin
          .from('tracks')
          .upsert(rows, { onConflict: 'spotify_id' });

        if (upsertErr) {
          console.warn(`  [${genre}] Upsert failed: ${upsertErr.message}`);
        } else {
          inserted = newTracks.length;
          totalInserted += inserted;
          for (const t of newTracks) {
            existingIds.add(t.spotify_id);
          }
        }
      }

      const skipped = tracks.length - newTracks.length;
      console.log(
        `  [${genre.padEnd(12)}] fetched=${tracks.length} new=${inserted} skipped=${skipped}`
      );
    } catch (err: any) {
      console.warn(`  [${genre}] Search failed: ${err.message}`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total fetched from Spotify: ${totalFetched}`);
  console.log(`Total new tracks inserted:  ${totalInserted}`);
  console.log(`Genres searched:            ${GENRES.length}`);
  console.log(`Tracks in DB now:           ${existingIds.size}`);
}

seedExpand().catch((err) => {
  console.error('Seed expand failed:', err);
  process.exit(1);
});
