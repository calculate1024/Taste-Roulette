// Re-tag all tracks in the database using Last.fm and MusicBrainz.
// Usage: npx tsx src/scripts/retag-tracks.ts
//
// This is a one-time or periodic batch job to improve genre accuracy.
// Rate-limited to avoid hitting API limits.

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { supabaseAdmin } from '../services/supabase';
import { getGenreTags } from '../services/genre-tagger';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retagTracks() {
  console.log('=== Re-tag Tracks Script ===\n');

  // Fetch all tracks
  const { data: tracks, error } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id, title, artist, genres')
    .order('updated_at', { ascending: true }); // Oldest first

  if (error || !tracks) {
    console.error('Failed to fetch tracks:', error?.message);
    process.exit(1);
  }

  console.log(`Found ${tracks.length} tracks to process.\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const track of tracks) {
    try {
      const result = await getGenreTags(track.artist, track.title, track.genres || []);

      if (result.source !== 'manual' && result.source !== 'fallback') {
        // Only update if we got better data from external sources
        const { error: updateErr } = await supabaseAdmin
          .from('tracks')
          .update({ genres: result.genres, updated_at: new Date().toISOString() })
          .eq('spotify_id', track.spotify_id);

        if (updateErr) {
          console.warn(`  FAIL: ${track.artist} — ${track.title}: ${updateErr.message}`);
          failed++;
        } else {
          const oldGenres = (track.genres || []).join(', ') || 'none';
          const newGenres = result.genres.join(', ');
          console.log(
            `  UPDATED: ${track.artist} — ${track.title}` +
            `  [${oldGenres}] → [${newGenres}] (${result.source}, ${result.confidence})`
          );
          updated++;
        }
      } else {
        skipped++;
      }
    } catch (err: any) {
      console.warn(`  ERROR: ${track.artist} — ${track.title}: ${err.message}`);
      failed++;
    }

    // Rate limiting: 1.5s between requests (MusicBrainz limit is 1/sec)
    await sleep(1500);
  }

  console.log('\n=== Summary ===');
  console.log(`Total tracks:  ${tracks.length}`);
  console.log(`Updated:       ${updated}`);
  console.log(`Skipped:       ${skipped} (no better data found)`);
  console.log(`Failed:        ${failed}`);
}

retagTracks().catch((err) => {
  console.error('Retag script failed:', err);
  process.exit(1);
});
