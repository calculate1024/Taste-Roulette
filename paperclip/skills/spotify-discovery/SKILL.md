# Spotify Discovery Skill

## Purpose
Search and discover new music tracks from Spotify for the recommendation pool.

## Context
Taste Roulette needs a constantly refreshed pool of diverse tracks. This skill searches
Spotify by genre, editorial playlists, and trending charts to find candidates.

## Tools Required
- Spotify Web API (client credentials flow)
- Last.fm API (genre tagging)

## Procedure

### 1. Check Pool Status
```sql
SELECT COUNT(*) as total,
       unnest(genres) as genre, COUNT(*) as genre_count
FROM tracks t
JOIN user_recommendations ur ON ur.track_id = t.spotify_id
WHERE ur.used = false
GROUP BY genre
ORDER BY genre_count ASC;
```
Identify genres with < 10 unused tracks (underrepresented).

### 2. Search Spotify
For each underrepresented genre:
```
GET /v1/search?q=genre:{genre}&type=track&market=TW&limit=20
```
Filter criteria:
- `popularity >= 50` (discoverable but not overplayed)
- `preview_url IS NOT NULL` or has Spotify embed
- Not already in `tracks` table

### 3. Enrich with Genre Tags
For each candidate track:
1. Call Last.fm `track.getTopTags` → map to 21 internal genres
2. If no tags, try Last.fm `artist.getTopTags`
3. If still no tags, use Spotify's genre from artist endpoint
4. Require at least 1 resolved genre

### 4. Insert to Pool
```sql
-- Insert track metadata
INSERT INTO tracks (spotify_id, title, artist, album, cover_url, preview_url, genres)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (spotify_id) DO UPDATE SET genres = $7, updated_at = now();

-- Create curator recommendation
INSERT INTO user_recommendations (user_id, track_id, reason, used)
VALUES ('curator-system-id', $1, $2, false);
```

### 5. Report
Output summary:
- Tracks searched: N
- Tracks added: M
- Genre distribution after addition
- Any genres still underrepresented

## Quality Gates
- Never add a track without at least 1 valid genre tag
- Never add a track from an artist already in pool 3+ times this month
- Skip tracks with explicit content flag unless genre is hip-hop/metal/punk
- Respect Spotify rate limits (429 → exponential backoff)

## Rate Limits
- Spotify: 100 requests/min (client credentials)
- Last.fm: 5 requests/sec
- MusicBrainz: 1 request/sec (if used as fallback)
