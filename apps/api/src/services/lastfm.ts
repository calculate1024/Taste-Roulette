// Last.fm API client for genre tagging
// API docs: https://www.last.fm/api/show/artist.getTopTags

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0';

interface LastfmTag {
  name: string;
  count: number; // 0-100 relevance
}

/**
 * Fetch top tags for an artist from Last.fm.
 * Returns raw tag list sorted by relevance (count).
 */
export async function getArtistTags(artistName: string): Promise<LastfmTag[]> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    return [];
  }

  const params = new URLSearchParams({
    method: 'artist.gettoptags',
    artist: artistName,
    api_key: apiKey,
    format: 'json',
  });

  try {
    const res = await fetch(`${LASTFM_API_BASE}/?${params}`);
    if (!res.ok) return [];

    const data: any = await res.json();
    const tags: any[] = data?.toptags?.tag || [];

    return tags
      .filter((t: any) => typeof t.name === 'string' && typeof t.count === 'number')
      .map((t: any) => ({ name: t.name.toLowerCase().trim(), count: Number(t.count) }))
      .filter((t) => t.count >= 20) // Only tags with reasonable confidence
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

/**
 * Fetch top tags for a track from Last.fm.
 */
export async function getTrackTags(artistName: string, trackName: string): Promise<LastfmTag[]> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    return [];
  }

  const params = new URLSearchParams({
    method: 'track.gettoptags',
    artist: artistName,
    track: trackName,
    api_key: apiKey,
    format: 'json',
  });

  try {
    const res = await fetch(`${LASTFM_API_BASE}/?${params}`);
    if (!res.ok) return [];

    const data: any = await res.json();
    const tags: any[] = data?.toptags?.tag || [];

    return tags
      .filter((t: any) => typeof t.name === 'string' && typeof t.count === 'number')
      .map((t: any) => ({ name: t.name.toLowerCase().trim(), count: Number(t.count) }))
      .filter((t) => t.count >= 15)
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}
