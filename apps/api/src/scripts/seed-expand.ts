// Auto-expand tracks table by searching Spotify for tracks in each genre
// Usage: npx tsx src/scripts/seed-expand.ts

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { searchTracks, SpotifyTrack } from '../services/spotify';
import { supabaseAdmin } from '../services/supabase';
import { getGenreTags } from '../services/genre-tagger';
import { GENRES } from '../utils/genres';

const SEARCH_LIMIT = 10;
const MIN_POPULARITY = 60;
const RATE_LIMIT_MS = 100;

type FamiliarityTier = 'anchor' | 'familiar' | 'discovery';

function getFamiliarityTier(popularity: number): FamiliarityTier {
  if (popularity >= 80) return 'anchor';
  if (popularity >= 65) return 'familiar';
  return 'discovery';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GenreSummary {
  fetched: number;
  qualified: number;
  inserted: number;
}

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

  const perGenre: Record<string, GenreSummary> = {};
  let totalFetched = 0;
  let totalInserted = 0;

  for (const genre of GENRES) {
    const summary: GenreSummary = { fetched: 0, qualified: 0, inserted: 0 };

    try {
      const tracks = await searchTracks(`genre:${genre}`, SEARCH_LIMIT);
      summary.fetched = tracks.length;
      totalFetched += tracks.length;

      // Filter by popularity
      const qualified = tracks.filter((t) => t.popularity >= MIN_POPULARITY);
      summary.qualified = qualified.length;

      // Filter out already-existing tracks
      const newTracks = qualified.filter((t) => !existingIds.has(t.spotify_id));

      if (newTracks.length > 0) {
        const rows = [];
        for (const t of newTracks) {
          // Try Last.fm for better genre tagging
          let trackGenres = [genre]; // Default to search genre
          let genreSource = 'search';
          try {
            const tagResult = await getGenreTags(t.artist, t.title, [genre]);
            if (tagResult.source === 'lastfm' && tagResult.genres.length > 0) {
              trackGenres = tagResult.genres;
              genreSource = `lastfm(${tagResult.confidence})`;
            }
            // Small delay to respect Last.fm rate limit
            await sleep(200);
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
            popularity: t.popularity,
            updated_at: new Date().toISOString(),
          });
        }

        const { error: upsertErr } = await supabaseAdmin
          .from('tracks')
          .upsert(rows, { onConflict: 'spotify_id' });

        if (upsertErr) {
          console.warn(`  [${genre}] Upsert failed: ${upsertErr.message}`);
        } else {
          summary.inserted = newTracks.length;
          totalInserted += newTracks.length;

          // Track inserted IDs so later genres skip them too
          for (const t of newTracks) {
            existingIds.add(t.spotify_id);
          }
        }
      }

      // Log per-genre details with familiarity breakdown
      const tierCounts = { anchor: 0, familiar: 0, discovery: 0 };
      for (const t of qualified) {
        tierCounts[getFamiliarityTier(t.popularity)]++;
      }

      const skipped = qualified.length - newTracks.length;
      console.log(
        `  [${genre.padEnd(12)}] fetched=${summary.fetched} qualified=${summary.qualified} ` +
        `new=${summary.inserted} skipped=${skipped} ` +
        `(anchor=${tierCounts.anchor} familiar=${tierCounts.familiar} discovery=${tierCounts.discovery})`
      );
    } catch (err: any) {
      console.warn(`  [${genre}] Search failed: ${err.message}`);
    }

    perGenre[genre] = summary;

    // Rate limiting between API calls
    await sleep(RATE_LIMIT_MS);
  }

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total fetched from Spotify: ${totalFetched}`);
  console.log(`Total new tracks inserted:  ${totalInserted}`);
  console.log(`Genres searched:            ${GENRES.length}`);
  console.log(`Tracks already in DB:       ${existingIds.size}`);
}

seedExpand().catch((err) => {
  console.error('Seed expand failed:', err);
  process.exit(1);
});
