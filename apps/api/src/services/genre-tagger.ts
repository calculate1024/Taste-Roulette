// Genre tagging service: combines Last.fm and MusicBrainz tags
// to produce accurate genre labels for tracks.

import { getArtistTags as getLastfmArtistTags, getTrackTags } from './lastfm';
import { getRecordingTags, getArtistTags as getMBArtistTags } from './musicbrainz';
import { mapTagsToGenres } from '../utils/tag-mapper';

interface GenreTagResult {
  genres: string[];
  source: 'lastfm' | 'musicbrainz' | 'combined' | 'manual' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Get genre tags for a track using multiple sources.
 * Priority: Last.fm track tags > Last.fm artist tags > MusicBrainz > manual > fallback
 *
 * @param artistName - Artist name for lookup
 * @param trackName - Track name for lookup
 * @param existingGenres - Already-assigned genres (from seed data)
 */
export async function getGenreTags(
  artistName: string,
  trackName: string,
  existingGenres: string[] = []
): Promise<GenreTagResult> {
  // 1. Try Last.fm track-level tags (most specific)
  const trackTags = await getTrackTags(artistName, trackName);
  if (trackTags.length >= 3) {
    const genres = mapTagsToGenres(trackTags);
    if (genres.length >= 1) {
      return { genres, source: 'lastfm', confidence: 'high' };
    }
  }

  // 2. Try Last.fm artist-level tags
  const lastfmArtistTags = await getLastfmArtistTags(artistName);
  if (lastfmArtistTags.length >= 3) {
    const genres = mapTagsToGenres(lastfmArtistTags);
    if (genres.length >= 1) {
      return { genres, source: 'lastfm', confidence: 'medium' };
    }
  }

  // 3. Try MusicBrainz recording tags
  try {
    const mbRecordingTags = await getRecordingTags(artistName, trackName);
    if (mbRecordingTags.length >= 1) {
      const genres = mapTagsToGenres(mbRecordingTags);
      if (genres.length >= 1) {
        return { genres, source: 'musicbrainz', confidence: 'medium' };
      }
    }
  } catch { /* MusicBrainz rate limited or unavailable */ }

  // 4. Try MusicBrainz artist tags
  try {
    const mbArtistTags = await getMBArtistTags(artistName);
    if (mbArtistTags.length >= 1) {
      const genres = mapTagsToGenres(mbArtistTags);
      if (genres.length >= 1) {
        return { genres, source: 'musicbrainz', confidence: 'low' };
      }
    }
  } catch { /* MusicBrainz unavailable */ }

  // 5. Combine all available tags as last resort
  const allTags = [...trackTags, ...lastfmArtistTags];
  if (allTags.length > 0) {
    const genres = mapTagsToGenres(allTags);
    if (genres.length >= 1) {
      return { genres, source: 'combined', confidence: 'low' };
    }
  }

  // 6. Fall back to existing genres
  if (existingGenres.length > 0) {
    return { genres: existingGenres, source: 'manual', confidence: 'medium' };
  }

  return { genres: ['pop'], source: 'fallback', confidence: 'low' };
}
