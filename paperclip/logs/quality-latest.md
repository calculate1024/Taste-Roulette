# Quality Assurance — 2026-03-23
## Status: warning

## Summary
- Full QA sweep: pool health, content moderation (92 new submissions in 24h window), dedup, genre distribution, track validity, feedback pulse, prompt-injection scan, recent card delivery check
- First organic auto-approve: 1 submission from a non-Curator account passed all moderation checks (1% approve rate); Curator bulk load (1000) now aged out of 24h window, submissions volume normalised to 92
- Orphaned pool entries reduced from 52 to 33 — Curator resolved 19 orphans since last run; 33 still unresolved

## Metrics
- Pool (unused): 1000  [target >=200 — OK]
- Pool freshness (7d): 100%  [OK]
- Days to depletion: 9.1  [WARN — target >14d]
- Cards/day: 110  |  All-time: 2443
- Most recent card delivered: 2026-03-22T13:12 UTC
- Submissions 24h: 92  |  Auto-approve: 1 (1%)  |  Flagged: 91  |  Rejected: 0
- Flag breakdown: high_volume=91 (World Wanderer curator account)
- Note: 1 organic submission auto-approved — uid=87cd9416... (anonymised), valid track, clean reason, no dedup
- Feedbacks 24h: 2  |  Surprised: 1 (50%)  |  Okay: 1 (50%)  |  Rejection rate: 0%  [surprise rate GREAT >=30%]
- Tracks catalogue: 1000  |  Genre coverage: 20/21 expected
- Genre imbalance (expected): pop(164) vs metal(22) = 7.5x  [threshold 3x — ALERT]
- Genre imbalance (all incl. extra): pop(164) vs afrobeats(4) = 41.0x
- Orphaned pool entries: 33  (down from 52 — 19 resolved since 2026-03-22)
- Recent cards (last 20): all status=pending
- Security incidents: 0  |  Injection attempts detected: 0
- Profiles: 110

## Issues
1. **33 orphaned pool entries (partially resolved)** — 19 of 52 fixed; 33 remain with track_ids in user_recommendations but no metadata in tracks table. Sample IDs: 4tXSYvu77bFRRXmQailX3f, 2x7MyWybabEz6Y6wvHuwGE, 5V0NmTDWnv5ZuDXi8ChZd8. Curator must complete resolution.
2. **Days to depletion: 9.1** — below 14d threshold. At 110 cards/day, pool exhausted ~2026-04-01. Next Curator fill needed before 2026-03-28.
3. **Genre imbalance 7.5x** — pop(164) vs metal(22). Exceeds 3x threshold. Next fill should cap pop; prioritise metal, blues, k-pop, world.
4. **'alternative' genre missing** — 0 tracks in catalogue across all heartbeats. No Curator action yet.

## Next Actions
- Curator Agent: complete resolution of remaining 33 orphaned entries — insert track metadata or mark used=true to retire
- Curator Agent: plan next fill before 2026-03-28 (9.1d remaining at 110 cards/day)
- Curator Agent: source 'alternative' genre tracks — missing all consecutive runs
- Curator Agent: rebalance next fill — cap pop; prioritise metal(>=50), blues(>=50), k-pop(>=50), world(>=50)
- Calvin: source=curator policy exemption still useful for World Wanderer (91 submissions/24h flagged as high_volume) — pending approval
