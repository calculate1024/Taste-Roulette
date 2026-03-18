// MusicBrainz API client for genre tagging
// API docs: https://musicbrainz.org/doc/MusicBrainz_API
// Rate limit: 1 req/sec, User-Agent required

const MB_API_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'TasteRoulette/1.0 (taste-roulette@example.com)';

interface MBTag {
  name: string;
  count: number;
}

/**
 * Search MusicBrainz for a recording by artist and title.
 * Returns genre/tag information if found.
 */
export async function getRecordingTags(
  artistName: string,
  trackName: string
): Promise<MBTag[]> {
  try {
    // Search for the recording
    const query = encodeURIComponent(`recording:"${trackName}" AND artist:"${artistName}"`);
    const searchRes = await fetch(
      `${MB_API_BASE}/recording/?query=${query}&limit=1&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (!searchRes.ok) return [];

    const searchData: any = await searchRes.json();
    const recordings = searchData?.recordings || [];
    if (recordings.length === 0) return [];

    const recordingId = recordings[0].id;

    // Fetch full recording details with tags
    const detailRes = await fetch(
      `${MB_API_BASE}/recording/${recordingId}?inc=tags+genres&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (!detailRes.ok) return [];

    const detail: any = await detailRes.json();

    // Combine tags and genres
    const tags: MBTag[] = [];

    if (detail.tags) {
      for (const t of detail.tags) {
        tags.push({ name: t.name.toLowerCase().trim(), count: t.count || 0 });
      }
    }

    if (detail.genres) {
      for (const g of detail.genres) {
        // MusicBrainz genres are more curated than tags
        tags.push({ name: g.name.toLowerCase().trim(), count: (g.count || 0) + 10 });
      }
    }

    return tags.sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

/**
 * Search MusicBrainz for an artist and get their tags/genres.
 */
export async function getArtistTags(artistName: string): Promise<MBTag[]> {
  try {
    const query = encodeURIComponent(`artist:"${artistName}"`);
    const searchRes = await fetch(
      `${MB_API_BASE}/artist/?query=${query}&limit=1&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (!searchRes.ok) return [];

    const searchData: any = await searchRes.json();
    const artists = searchData?.artists || [];
    if (artists.length === 0) return [];

    const artistId = artists[0].id;

    const detailRes = await fetch(
      `${MB_API_BASE}/artist/${artistId}?inc=tags+genres&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (!detailRes.ok) return [];

    const detail: any = await detailRes.json();

    const tags: MBTag[] = [];

    if (detail.tags) {
      for (const t of detail.tags) {
        tags.push({ name: t.name.toLowerCase().trim(), count: t.count || 0 });
      }
    }

    if (detail.genres) {
      for (const g of detail.genres) {
        tags.push({ name: g.name.toLowerCase().trim(), count: (g.count || 0) + 10 });
      }
    }

    return tags.sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}
