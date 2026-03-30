// Spotify matching: search + dedup wrapper

import { searchTracks, getTrack, ensureTrackCached } from '../../services/spotify';
import { supabaseAdmin } from '../../services/supabase';
import type { ScrapedTrack, MatchedTrack } from './types';
import { generateReason } from './reason-rewriter';

/** Normalize string for comparison: lowercase, decode HTML entities, strip suffixes. */
function normalize(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .toLowerCase()
    .replace(/\(feat\.?.*?\)/gi, '')
    .replace(/\(remix\)/gi, '')
    .replace(/\(remaster.*?\)/gi, '')
    .replace(/\(live.*?\)/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/** Check if artist names are similar enough. */
function artistMatch(scraped: string, spotify: string): boolean {
  const a = normalize(scraped);
  const b = normalize(spotify);
  return b.includes(a) || a.includes(b);
}

/** Load existing track IDs and recommendation source URLs for dedup. */
export async function loadExistingIds(curatorId: string): Promise<{
  existingTrackIds: Set<string>;
  existingSourceUrls: Set<string>;
}> {
  const { data: recs } = await supabaseAdmin
    .from('user_recommendations')
    .select('track_id, source_url')
    .eq('user_id', curatorId);

  const existingTrackIds = new Set<string>();
  const existingSourceUrls = new Set<string>();

  for (const rec of recs ?? []) {
    existingTrackIds.add(rec.track_id);
    if (rec.source_url) existingSourceUrls.add(rec.source_url);
  }

  return { existingTrackIds, existingSourceUrls };
}

/** Match a scraped track to Spotify. Returns null if no match found. */
export async function matchToSpotify(
  scraped: ScrapedTrack,
  verbose = false,
  sourceName?: string,
): Promise<MatchedTrack | null> {
  try {
    // If we have a direct Spotify embed ID, use it
    if (scraped.spotifyEmbedId) {
      const track = await getTrack(scraped.spotifyEmbedId);
      if (track) {
        await ensureTrackCached(track.spotify_id);
        const { data: cached } = await supabaseAdmin
          .from('tracks')
          .select('genres')
          .eq('spotify_id', track.spotify_id)
          .maybeSingle();

        const genres = cached?.genres ?? [scraped.sourceGenreHint];
        return {
          ...scraped,
          spotifyId: track.spotify_id,
          genres,
          reason: generateReason(genres, scraped.articleTitle, sourceName),
        };
      }
    }

    // Search by artist + title
    const query = `${scraped.artist} ${scraped.title}`;
    const results = await searchTracks(query, 3);

    if (results.length === 0) {
      if (verbose) console.log(`  SKIP: no Spotify match for "${scraped.artist} - ${scraped.title}"`);
      return null;
    }

    // Find best match by artist name similarity
    const match = results.find((r) => artistMatch(scraped.artist, r.artist));
    const bestMatch = match ?? results[0];

    // Verify artist name is at least somewhat similar
    if (!artistMatch(scraped.artist, bestMatch.artist)) {
      if (verbose) console.log(`  SKIP: artist mismatch — scraped "${scraped.artist}" vs Spotify "${bestMatch.artist}"`);
      return null;
    }

    await ensureTrackCached(bestMatch.spotify_id);
    const { data: cached } = await supabaseAdmin
      .from('tracks')
      .select('genres')
      .eq('spotify_id', bestMatch.spotify_id)
      .maybeSingle();

    const genres = cached?.genres ?? [scraped.sourceGenreHint];
    return {
      ...scraped,
      spotifyId: bestMatch.spotify_id,
      genres,
      reason: generateReason(genres, scraped.articleTitle, sourceName),
    };
  } catch (err) {
    if (verbose) console.warn(`  ERROR matching "${scraped.artist} - ${scraped.title}":`, err);
    return null;
  }
}
