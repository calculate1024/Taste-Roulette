"""
Curator daily run — replenish recommendation pool with 200+ tracks.
Uses Spotify search + Last.fm genre enrichment → inserts to Supabase.
"""
import sys
import requests
import warnings
import json
import time
import io
from collections import defaultdict

warnings.filterwarnings("ignore")
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://txrirydpzyccwfeiteiu.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cmlyeWRwenljY3dmZWl0ZWl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcwOTQxNywiZXhwIjoyMDg5Mjg1NDE3fQ"
    ".lJh-6SW4diEPk6gixjKkK55J2mfzR0XT4vx1rctQCO4"
)
LASTFM_KEY = "f5a5ea2d3a94f89cfab33e3bb4376255"
SPOTIFY_CLIENT_ID = "8539a197d8ae481792f1b239850870ef"
SPOTIFY_CLIENT_SECRET = "0ed3a5effb9a4a7ca6468fbe1f2ac5e4"
# Most active curator in existing data
CURATOR_USER_ID = "7646ad7a-7687-41bf-a0c7-205152a23132"

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# ── Spotify auth ──────────────────────────────────────────────


def get_spotify_token():
    r = requests.post(
        "https://accounts.spotify.com/api/token",
        data={
            "grant_type": "client_credentials",
            "client_id": SPOTIFY_CLIENT_ID,
            "client_secret": SPOTIFY_CLIENT_SECRET,
        },
        verify=False,
    )
    r.raise_for_status()
    return r.json()["access_token"]


# ── Last.fm genre mapping ─────────────────────────────────────
GENRE_MAP = {
    "pop": "pop",
    "rock": "rock",
    "hip-hop": "hip-hop",
    "hip hop": "hip-hop",
    "rap": "hip-hop",
    "r&b": "r&b",
    "rnb": "r&b",
    "soul": "soul",
    "jazz": "jazz",
    "classical": "classical",
    "electronic": "electronic",
    "ambient": "ambient",
    "dance": "electronic",
    "edm": "electronic",
    "house": "electronic",
    "techno": "electronic",
    "synthpop": "electronic",
    "latin": "latin",
    "reggaeton": "latin",
    "salsa": "latin",
    "cumbia": "latin",
    "country": "country",
    "folk": "folk",
    "americana": "folk",
    "bluegrass": "folk",
    "metal": "metal",
    "heavy metal": "metal",
    "punk": "punk",
    "hardcore": "punk",
    "indie": "indie",
    "alternative": "indie",
    "shoegaze": "indie",
    "reggae": "reggae",
    "dub": "reggae",
    "dancehall": "reggae",
    "ska": "reggae",
    "world": "world",
    "afrobeat": "world",
    "worldbeat": "world",
    "afropop": "world",
    "blues": "blues",
    "k-pop": "k-pop",
    "kpop": "k-pop",
    "j-pop": "j-pop",
    "jpop": "j-pop",
    "c-pop": "c-pop",
    "mandopop": "c-pop",
    "cantopop": "c-pop",
}


def get_lastfm_genres(artist, title, primary_genre):
    try:
        r = requests.get(
            "https://ws.audioscrobbler.com/2.0/",
            params={
                "method": "track.getTopTags",
                "artist": artist,
                "track": title,
                "api_key": LASTFM_KEY,
                "format": "json",
            },
            timeout=5,
            verify=False,
        )
        tags = r.json().get("toptags", {}).get("tag", [])
        genres = []
        for tag in tags[:15]:
            name = tag.get("name", "").lower()
            for key, mapped in GENRE_MAP.items():
                if key in name and mapped not in genres:
                    genres.append(mapped)
        if not genres:
            r2 = requests.get(
                "https://ws.audioscrobbler.com/2.0/",
                params={
                    "method": "artist.getTopTags",
                    "artist": artist,
                    "api_key": LASTFM_KEY,
                    "format": "json",
                },
                timeout=5,
                verify=False,
            )
            for tag in r2.json().get("toptags", {}).get("tag", [])[:15]:
                name = tag.get("name", "").lower()
                for key, mapped in GENRE_MAP.items():
                    if key in name and mapped not in genres:
                        genres.append(mapped)
        return genres[:3] if genres else [primary_genre]
    except Exception:
        return [primary_genre]


# ── Genre search plan ─────────────────────────────────────────
# Queries designed to find DISTINCT tracks — no duplicate seeds
GENRE_SEARCHES = {
    "world": [
        "afrobeat music",
        "world music roots",
        "african folk music",
        "global fusion worldbeat",
    ],
    "country": [
        "country singer songwriter acoustic",
        "modern country 2024 nashville",
        "country folk americana",
        "bluegrass country traditional",
    ],
    "reggae": [
        "roots reggae music",
        "dancehall reggae 2024",
        "ska reggae dub",
        "contemporary reggae",
    ],
    "latin": [
        "cumbia salsa latin",
        "latin alternative indie",
        "flamenco latin fusion",
        "bossa nova latin jazz",
    ],
    "metal": [
        "progressive metal 2024",
        "indie metal shoegaze",
        "alternative metal rock",
        "doom metal stoner",
    ],
    "jazz": [
        "jazz piano standards",
        "contemporary jazz 2024",
        "jazz fusion modern",
        "bebop jazz trumpet saxophone",
    ],
    "punk": [
        "punk rock alternative",
        "post-punk indie 2024",
        "emo punk hardcore",
        "garage punk rock",
    ],
    "classical": [
        "classical piano 2024",
        "orchestral classical music",
        "chamber music string",
        "contemporary classical composer",
    ],
    "blues": [
        "blues guitar electric",
        "delta blues acoustic",
        "chicago blues modern",
        "blues rock soul",
    ],
    "ambient": [
        "ambient electronic music",
        "lo-fi ambient chill",
        "atmospheric drone music",
        "ambient piano instrumental",
    ],
    "folk": [
        "folk singer songwriter acoustic",
        "indie folk 2024",
        "traditional folk music",
        "celtic folk music",
    ],
    "indie": [
        "indie rock 2024",
        "dream pop indie alternative",
        "lo-fi indie bedroom pop",
        "indie post-rock",
    ],
    "electronic": [
        "electronic music 2024",
        "house electronic dance",
        "synthwave electronic retro",
        "techno electronic minimal",
    ],
    "hip-hop": [
        "underground hip hop rap",
        "alternative hip hop 2024",
        "boom bap hip hop",
        "conscious rap hip hop",
    ],
    "r&b": [
        "contemporary r&b 2024",
        "neo soul r&b",
        "r&b soul smooth",
        "alternative r&b",
    ],
    "soul": [
        "neo soul music 2024",
        "classic soul gospel",
        "soul funk music",
        "soul singer contemporary",
    ],
    "pop": [
        "indie pop 2024",
        "alternative pop singer",
        "synth pop 2024",
        "chamber pop orchestral",
    ],
}

# Genres where explicit content is acceptable
EXPLICIT_OK_GENRES = {"hip-hop", "metal", "punk", "r&b"}


def main():
    print("=== Taste Roulette Curator — Daily Run ===")
    print(f"Target: 200 unused tracks in pool\n")

    # Auth
    spotify_token = get_spotify_token()
    sp_headers = {"Authorization": f"Bearer {spotify_token}"}

    # Load existing track IDs
    existing_ids = set()
    offset = 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/tracks?select=spotify_id&limit=500&offset={offset}",
            headers=SB_HEADERS,
        )
        batch = r.json()
        if not isinstance(batch, list):
            print(f"ERROR loading existing tracks: {batch}")
            break
        existing_ids.update(t["spotify_id"] for t in batch)
        if len(batch) < 500:
            break
        offset += 500
    print(f"Existing tracks in DB: {len(existing_ids)}")

    # Collect candidates
    candidates = {}  # spotify_id -> data

    for genre, queries in GENRE_SEARCHES.items():
        genre_new = 0
        for query in queries:
            r = requests.get(
                "https://api.spotify.com/v1/search",
                params={"q": query, "type": "track", "market": "US", "limit": 10},
                headers=sp_headers,
                verify=False,
            )
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 10))
                print(f"  Rate limited, waiting {wait}s")
                time.sleep(wait)
                continue
            if r.status_code != 200:
                print(f"  Spotify error {r.status_code} for query: {query} | {r.text[:120]}")
                continue

            items = r.json().get("tracks", {}).get("items", [])
            for t in items:
                tid = t["id"]
                if tid in existing_ids or tid in candidates:
                    continue
                images = t.get("album", {}).get("images", [])
                cover_url = images[0]["url"] if images else None
                if not cover_url:
                    continue
                # Explicit filter
                if t.get("explicit") and genre not in EXPLICIT_OK_GENRES:
                    continue
                candidates[tid] = {
                    "spotify_id": tid,
                    "title": t["name"],
                    "artist": t["artists"][0]["name"],
                    "album": t.get("album", {}).get("name", ""),
                    "cover_url": cover_url,
                    "spotify_url": t.get("external_urls", {}).get("spotify", ""),
                    "popularity": t.get("popularity", 0),
                    "primary_genre": genre,
                }
                genre_new += 1
            time.sleep(0.12)
        print(f"  {genre:12}: +{genre_new} candidates")

    print(f"\nTotal new candidates found: {len(candidates)}")

    if not candidates:
        print("No new candidates. Pool cannot be replenished with new tracks.")
        return

    # Enrich with Last.fm genres and insert
    tracks_inserted = 0
    recs_inserted = 0
    genre_tally = defaultdict(int)
    lastfm_failures = 0

    print("\nEnriching with Last.fm tags and inserting to Supabase...")

    for i, (tid, data) in enumerate(candidates.items()):
        if i % 20 == 0:
            print(f"  Processing {i}/{len(candidates)}...")

        # Last.fm genre enrichment
        genres = get_lastfm_genres(data["artist"], data["title"], data["primary_genre"])
        if not genres:
            lastfm_failures += 1
            continue

        # Insert track metadata
        track_payload = {
            "spotify_id": data["spotify_id"],
            "title": data["title"],
            "artist": data["artist"],
            "album": data["album"],
            "cover_url": data["cover_url"],
            "spotify_url": data.get("spotify_url", ""),
            "genres": genres,
        }
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/tracks",
            headers={**SB_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=track_payload,
        )
        if r.status_code not in (200, 201, 204):
            print(f"  Track insert error {r.status_code}: {r.text[:100]}")
            continue
        tracks_inserted += 1

        # Insert curator recommendation
        reason = f"Curated pick from {data['primary_genre'].title()} catalog"
        rec_payload = {
            "user_id": CURATOR_USER_ID,
            "track_id": data["spotify_id"],
            "reason": reason,
            "used": False,
            "is_curator_pick": True,
        }
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/user_recommendations",
            headers={**SB_HEADERS, "Prefer": "return=minimal"},
            json=rec_payload,
        )
        if r.status_code in (200, 201, 204):
            recs_inserted += 1
            for g in genres:
                genre_tally[g] += 1
        else:
            print(f"  Rec insert error {r.status_code}: {r.text[:100]}")

        time.sleep(0.05)

    # Final pool check
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_recommendations?used=eq.false&select=count",
        headers={**SB_HEADERS, "Prefer": "count=exact"},
    )
    pool_size_hdr = r.headers.get("Content-Range", "*/unknown")

    print(f"\n{'='*40}")
    print(f"Pool Status: {pool_size_hdr.split('/')[-1]} tracks (post-run)")
    print(f"Tracks inserted: {tracks_inserted}")
    print(f"Recommendations added: {recs_inserted}")
    print(f"Last.fm failures: {lastfm_failures}")
    print(f"\nGenre distribution added:")
    for genre, count in sorted(genre_tally.items(), key=lambda x: -x[1]):
        print(f"  {genre:12}: {count}")

    total_genres = len(genre_tally)
    print(f"\nGenre coverage this run: {total_genres}/21")
    if total_genres >= 15:
        print("PASS: >= 15 genres covered")
    else:
        print(f"WARN: Only {total_genres} genres covered (target: 15+)")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Curator daily pool replenishment")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no DB writes")
    args = parser.parse_args()

    if args.dry_run:
        print("DRY RUN — no changes will be made. Exiting.")
        sys.exit(0)

    main()
