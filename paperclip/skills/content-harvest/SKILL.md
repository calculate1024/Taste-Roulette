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

## Finding New Sources (Curator Agent Responsibility)

When existing sources are exhausted or genre gaps persist:

1. Search for music blogs/publications covering the weak genre
2. Verify: public content, no login required, robots.txt allows crawling
3. Test: can artist + track be extracted from article titles?
4. Report to Calvin via log: "Suggest new source: {url}, covers {genres}, feasibility: {high/medium/low}"
5. Calvin or dev session will build the parser

Do NOT attempt to build parsers autonomously — report source candidates only.
