# Content Harvest Skill

## Purpose
Scrape public music media articles → extract track recommendations → match to Spotify → insert as curator picks into the recommendation pool. Fills genre gaps without waiting for human curators.

## When to Use
- Pool size < target (see pool-management skill for targets)
- Specific genre has 0 or < 10 tracks in pool
- Weekly Wednesday deep analysis identifies gaps
- Calvin requests via inbox

## Available Sources

| Source | CLI name | Genres | Notes |
|--------|----------|--------|-------|
| Earmilk | `earmilk` | electronic, hip-hop, indie | WordPress, some Spotify embeds |
| Stereofox | `stereofox` | indie, electronic, folk | Good Spotify integration |
| MetalSucks | `metal-sucks` | metal, rock, punk | Ghost CMS, .gh-article pattern |

## Command

```bash
cd apps/api && npm run harvest -- --source <name> --limit <N> [--dry-run] [--verbose]
```

- `--source`: earmilk | stereofox | metal-sucks | all
- `--limit`: max articles to scrape (default: 20, recommended: 10-20)
- `--dry-run`: preview without DB writes
- `--verbose`: detailed per-track logs

## Decision Logic

### Which source to run?

1. Query genre gaps:
```sql
SELECT g.genre, COUNT(*) as count
FROM user_recommendations ur
JOIN tracks t ON t.spotify_id = ur.track_id
CROSS JOIN LATERAL unnest(t.genres) AS g(genre)
WHERE ur.used = false
GROUP BY g.genre
ORDER BY count ASC;
```

2. Match gaps to sources:
   - metal/rock/punk gap → run `metal-sucks`
   - electronic/hip-hop gap → run `earmilk`
   - indie/folk/electronic gap → run `stereofox`
   - Multiple gaps → run `all` with `--limit 10`

### How many to harvest?

- Pool < 100 unused → aggressive: `--limit 20` on `all`
- Pool 100-300 → moderate: `--limit 10` on gap sources
- Pool > 300 → maintenance: `--limit 5` on weakest genre source
- Never exceed `--limit 30` (rate limit + quality)

## Output Expectations

- Each source produces 3-10 valid tracks per 10 articles
- Match rate depends on source (Spotify embeds = ~100%, title parsing = ~50%)
- All reasons are template-generated (never copied from source)
- Dedup prevents re-inserting existing tracks

## Integration

Harvested tracks enter the pool as `is_curator_pick = true` with curator_weight 1.5.
The daily matching engine automatically picks them up — no manual action needed.

## Verification After Run

```sql
-- Check new recommendations from harvest curators
SELECT p.display_name, COUNT(*) as recs, COUNT(*) FILTER (WHERE ur.used = false) as unused
FROM user_recommendations ur
JOIN profiles p ON p.id = ur.user_id
WHERE p.display_name LIKE '%Editors%'
GROUP BY p.display_name;
```

## Candidate Sources (parser not yet built — for future expansion)

Researched 2026-03-26. Curator agent should reference this list when genre gaps persist.

### Priority Tier (high feasibility, fills critical gaps)

| Source | URL | Genres | Feasibility | Notes |
|--------|-----|--------|-------------|-------|
| **Bandcamp Daily** | daily.bandcamp.com | jazz, world, folk, classical | High | Best multi-genre source. Clean HTML. No Spotify embeds (Bandcamp players) — needs Spotify search step |
| **Loudwire** | loudwire.com | metal, hard rock, punk | High | Ranked song lists with Spotify playlists. Clean format. Replaces low-yield MetalSucks |
| **For The Love Of Bands** | fortheloveofbands.com | folk, reggae, country, blues, indie | High | WordPress + Spotify embeds. Covers 4+ weak genres |
| **NPR Music** | npr.org/music | classical, jazz, world, latin | High | Broadest coverage. "Songs We Love" + Spotify playlists |
| **Consequence** | consequence.net | metal, indie, alternative | High | Structured "Artist — 'Track'" format. Apple Music links (use Spotify search) |

### Secondary Tier (medium feasibility or narrower scope)

| Source | URL | Genres | Feasibility | Notes |
|--------|-----|--------|-------------|-------|
| Indie Shuffle | indieshuffle.com | indie, electronic, neo-soul | High | Single-track focus, consistent structure |
| This Song Is Sick | thissongissick.com | electronic, hip-hop | High | Track-focused format |
| Louder/Metal Hammer | loudersound.com | metal | Medium | JS-heavy rendering, may need headless browser |
| Jazzwise | jazzwise.com | jazz | Medium | Album-focused, need track extraction from albums |
| JazzTimes | jazztimes.com | jazz | Medium | Possible partial paywall |
| Afropop Worldwide | afropop.org | world, reggae, latin | Medium | More editorial/podcast, less track lists |
| Twangville | twangville.com | country, folk, blues | Medium | Covers weak genres, structure unverified |

### Not Recommended

| Source | Reason |
|--------|--------|
| Songlines (songlines.co.uk) | Paywalled review database |
| Under the Radar (undertheradarmag.com) | Returns 403 on automated requests |

### Genre → Source Mapping (for gap-driven decisions)

| Weak Genre | Best Source to Request |
|-----------|----------------------|
| metal (19) | Loudwire, Consequence |
| world (15) | Bandcamp Daily, NPR Music |
| country (17) | For The Love Of Bands |
| reggae (18) | For The Love Of Bands |
| latin (19) | NPR Music, Afropop |
| jazz (24) | Bandcamp Daily, NPR Music |
| classical (28) | NPR Music, Bandcamp Daily |
| folk (48) | Bandcamp Daily, For The Love Of Bands |

## Finding New Sources (Curator Agent Responsibility)

When existing sources AND candidates above are exhausted or genre gaps persist:

1. Search for music blogs/publications covering the weak genre
2. Verify: public content, no login required, robots.txt allows crawling
3. Test: can artist + track be extracted from article titles?
4. Report to Calvin via log: "Suggest new source: {url}, covers {genres}, feasibility: {high/medium/low}"
5. Calvin or dev session will build the parser
6. Check this candidate list first before searching — avoid re-reporting known candidates

Do NOT attempt to build parsers autonomously — report source candidates only.
