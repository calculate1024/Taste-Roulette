# Content Curator — 2026-04-13

## Status: warning

## Inbox
Calvin's inbox contained priority instructions:
1. Reggae: +20 tracks (keywords: reggae, dancehall, ska, dub, roots reggae; artists: Bob Marley, Chronixx, Protoje, Koffee, Burning Spear, Steel Pulse, Toots and the Maytals)
2. Alternative: +15 tracks (keywords: shoegaze, post-punk, dream pop, alt-rock; artists: Radiohead, The National, Interpol, Slowdive, Beach House, Alvvays)
3. Monthly quota note: Monthly limit reset April 1; no active pause in effect as of April 13.
Inbox deleted after processing.

## Summary

- Ran targeted expansion for reggae (+20) and alternative/indie (+15) per Calvin's inbox instructions using new `curator-targeted-expand.ts` script
- 35 tracks processed (upserted): 20 reggae-targeted, 15 indie/alternative-targeted — net new to DB: ~1 track (pool already well-stocked at 5,111 tracks; most upserted tracks existed in the other 4,110 DB rows not in the script's 1,000-ID dedup window)
- CRITICAL issue flagged: `afrobeats` genre has only 4 tracks — below the 20-track minimum and not addressed today per Calvin's quota instructions (reggae + alternative only)

## Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Total pool size | 5,111 tracks | OK (well above all targets) |
| Pool target (month2_launch / 200 users) | 1,500 | ✅ Met |
| Pool target (month3_growth / 1,000 users) | 3,000 | ✅ Met |
| Freshness (updated last 7 days) | 29.6% (1,513 tracks) | ⚠️ Below 30% threshold |
| Freshness (updated last 30 days) | 100% | ✅ |
| Spotify API calls used | 5 | Well within Dev Mode limit |
| Tracks added/refreshed today | 35 | — |

### Genre distribution (full pool):

| Genre | Count | % | Flag |
|-------|-------|---|------|
| afrobeats | 4 | 0.1% | 🔴 CRITICAL (<20) |
| alternative | 8 | 0.2% | ⚠️ LOW (not in taxonomy) |
| k-pop | 135 | 2.6% | OK |
| world | 154 | 3.0% | OK |
| blues | 177 | 3.5% | OK |
| c-pop | 181 | 3.5% | OK |
| j-pop | 185 | 3.6% | OK |
| latin | 208 | 4.1% | OK |
| reggae | 222 | 4.3% | OK |
| metal | 224 | 4.4% | OK |
| classical | 250 | 4.9% | OK |
| country | 259 | 5.1% | OK |
| r&b | 291 | 5.7% | OK |
| soul | 326 | 6.4% | OK |
| ambient | 328 | 6.4% | OK |
| punk | 346 | 6.8% | OK |
| jazz | 357 | 7.0% | OK |
| folk | 468 | 9.2% | OK |
| hip-hop | 595 | 11.6% | OK |
| electronic | 701 | 13.7% | OK |
| rock | 789 | 15.4% | OK |
| indie | 839 | 16.4% | OK |
| pop | 927 | 18.1% | OK (under 25% cap) |

No genre exceeds 25% share. ✅

## Issues

1. **🔴 CRITICAL — Afrobeats: 4 tracks** — needs +16 minimum, escalate to CEO
2. **⚠️ "alternative" genre (8 tracks) not in GENRES taxonomy** — orphaned; should retag to indie/rock
3. **⚠️ Pool freshness 29.6%** — slightly below 30% target
4. **ℹ️ curator-targeted-expand.ts dedup covers only first 1,000 IDs** — causes extra upserts on existing tracks; needs pagination fix

## Next Actions

1. **Tomorrow CRITICAL**: Expand afrobeats (+20): Burna Boy, Wizkid, Davido, Tems, Ayra Starr
2. Fix dedup pagination in curator-targeted-expand.ts
3. Retag 8 orphaned "alternative" tracks to indie/rock
4. Another seed:expand pass this week to push freshness above 30%
