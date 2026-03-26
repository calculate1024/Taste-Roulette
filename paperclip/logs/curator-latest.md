# Content Curator — 2026-03-26

## Status: ok

## Inbox
Processed `paperclip/inbox/curator.md` (Calvin, 2026-03-26):
- **P0-1**: World Wanderer approval → confirmed 740 unused recs all have valid track metadata (0 orphans); already active in pool, no action needed
- **P0-2**: 413 orphaned entries fix → full scan found 0 orphans (2,545 recs × 2,480+ tracks — cross-join clean); issue was already resolved by the large track batch (+810 tracks, now 2,487 total)

## Summary
- Processed both P0 Calvin inbox items — both resolved by existing data state
- Inserted +7 k-pop tracks (quota: 7/10 used); k-pop now at 75/50 ✅
- Ran content-harvest across all 3 sources (stereofox, earmilk, metal-sucks) — all returned 0 new tracks (pool saturated from recent bulk expansion)
- Flagging all harvest sources as potentially stale; new source discovery recommended

## Metrics
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Pool size (unused) | 1,621 | ≥ 200 | ✅ |
| Total tracks in DB | 2,487 | — | — |
| Days buffer | ~14.6 | ≥ 14 | ✅ |
| Cards yesterday | 111 | ~110 | ✅ |
| Genre coverage | 21/21 | ≥ 18/21 | ✅ |
| k-pop | 75 | ≥ 50 | ✅ |
| Western core % | 44.0% | ≥ 40% | ✅ |
| Asian cap % | 12.9% | ≤ 20% | ✅ |
| All genres ≥ 50 | Yes | — | ✅ |
| Quota used today | 7/10 | ≤ 10 | ✅ |
| Harvest new tracks | 0 | 3–10 | ⚠️ Sources stale |
| Orphaned recs | 0 | 0 | ✅ |
| WW recs (unused) | 740 | — | ✅ |

## Genre Distribution (full scan, 2,487 tracks)
- pop: 408, rock: 397, indie: 361, electronic: 336, hip-hop: 316
- soul: 186, folk: 183, jazz: 195, classical: 143, metal: 145
- punk: 157, r&b: 159, ambient: 159, c-pop: 127, j-pop: 120
- blues: 117, latin: 117, country: 103, world: 96, reggae: 95, k-pop: 75

## Issues
- **Harvest sources saturated**: All 3 sources (stereofox, earmilk, metal-sucks) yielded 0 new tracks. Earmilk returned 5 duplicates (all already in pool); stereofox/metal-sucks had 0 Spotify matches. Pool expansion means these sources are largely exhausted.
- **New source candidates needed**: Pool is healthy now, but harvest capability will be needed long-term. Recommend Calvin prioritise finding sources for underrepresented genres: world (96), reggae (95), k-pop (75), blues (117).

## New Source Candidates (per curator.yaml source_discovery)
| Source | Genres | Feasibility | Notes |
|--------|--------|-------------|-------|
| Reggaeville (reggaeville.com) | reggae, dancehall | medium | Structured titles, artist names extractable |
| Last.fm Charts | world, folk, blues | high | Spotify-linked, structured metadata |
| Songkick Magazine | world, indie, folk | medium | Artist/track names in article titles |

## Next Actions
- Pool fill: 2026-04-02 deadline with ~14.6-day buffer — comfortable at current consumption
- Propose new harvest sources to Calvin (see above)
- Wednesday deep analysis: review if pool growth target for month3 (3,000 tracks) needs acceleration
