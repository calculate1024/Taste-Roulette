# Quality Assurance — 2026-03-26
## Status: warning

## Inbox
- No inbox message this run.
- Prior inbox (02:54 UTC run) actioned: curator monthly cap 50/month rule applied, script updated.

## Summary
- Full QA sweep (06:56 UTC, 2nd run today): pool health, content moderation (288 submissions), curator monthly cap check, dedup, genre distribution, track validity, feedback pulse, injection scan
- NEW: 8 editorial/harvester accounts appeared — NPR Music Editors (244), Earmilk Editors (21), TSIS Editors (5), Stereofox Editors (4), FTLOB Editors (2), MetalSucks Editors (1), Consequence Editors (1), plus 1 organic. All 285 editorial submissions flagged as high_volume_daily — these accounts are not in curator registry and exceed organic 5/day limit. Profiles jumped 111→121 (+10 in 4 hours).
- Cron healthy (111 cards yesterday), pool stable, orphans unchanged at 56 — no regressions on prior metrics

## Metrics
- Pool (unused): 1000  [OK]
- Pool freshness (7d): 100%  [OK]
- Cards/day (7d avg): 94.7
- Days to depletion: 10.6 nominal / 10.0 effective  [WARN <14d]
- Yesterday delivery (2026-03-25): 111 cards  [cron OK]
- Most recent card: 2026-03-26T02:36 UTC
- Submissions 24h: 288  |  Auto-approve: 3 (1%)  |  Flagged: 285 (high_volume_daily)  |  Rejected: 0
- Profiles: 121  (+10 new harvester accounts)
- Curator monthly status:
  - Curator System (uid=696dd7fb...): OVER CAP — auto-reject active
  - World Wanderer (uid=7646ad7a...): 0/50 effective (grandfathered)
- Feedbacks 24h: 4  |  Surprised: 2 (50%)  |  Okay: 2 (50%)  [GREAT]
- Recent cards: 1 opened, 2 feedback_given, 17 pending
- Tracks catalogue: 1000  |  Genre coverage: 20/21
- Genre imbalance: pop(168) vs world(25) = 6.7x  [ALERT >3x]
- Orphaned pool entries: 56 (6%)
- Security incidents: 0  |  Injection attempts: 0

## Harvester Accounts Pending Policy (285 submissions held)
| Account | UID prefix | Submissions |
|---|---|---|
| NPR Music Editors | b46309a2... | 244 |
| Earmilk Editors | e59fef3f... | 21 |
| TSIS Editors | c4a7c68a... | 5 |
| Stereofox Editors | c4b1f845... | 4 |
| FTLOB Editors | b328aaf9... | 2 |
| MetalSucks Editors | f82e754e... | 1 |
| Consequence Editors | 814ce6b4... | 1 |

All flagged high_volume_daily — not in curator registry. Awaiting Calvin/CEO policy decision.

## Issues
1. **285 harvester submissions held** — pending Calvin policy on editorial accounts.
2. **Curator System over monthly cap** — uid=696dd7fb..., CEO notification pending.
3. **Days to depletion: 10.6d / 10.0d effective** — fill before 2026-03-31.
4. **56 orphaned entries** — unchanged.
5. **Genre imbalance 6.7x** — `alternative` zero.

## Next Actions
- **Calvin / CEO Agent (URGENT)**: Policy for editorial harvester accounts — approve 285 submissions or define harvester exemption category.
- **CEO Agent**: Notify Curator System (uid=696dd7fb...) — over monthly cap, pause until April 1.
- **Curator Agent**: Resolve 56 orphaned entries.
- **Curator Agent**: Pool fill before 2026-03-31 (may be covered if 285 harvester submissions approved).
- **Curator Agent**: Source 'alternative' genre tracks; rebalance next fill (cap pop, fill alternative/world/blues/k-pop).
