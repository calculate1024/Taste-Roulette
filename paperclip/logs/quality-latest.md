# Quality Assurance — 2026-03-29
## Status: warning

## Inbox
- No inbox messages.

## Summary (22:51 UTC — post-cron)
- Cron on schedule: 2026-03-29T13:52 UTC. Profiles: 123 (+1 new user).
- **Reggae CRITICAL: 39 entries (-11 in one day)**. Imbalance hit 8.1x — worst recorded.
- b46309a2 (NPR Music Editors): 84 pool entries, no new submissions today. Day 6 unresolved.
- WW over daily cap again (20 vs 10). Freshness flat at 13.5%. Curator integrity clean.

## Metrics (22:51 UTC)
- Pool: 1663 (-22 post-cron) | Orphans: 0 | Days left: 14.3d (116.6/day)
- Last cron: 2026-03-29T13:52 UTC [OK] | Cards yesterday: 121 [OK]
- Profiles: 123 (+1) | Feedbacks 24h: 1 | Freshness: 13.5% [ALERT]
- Submissions 24h: 21 (WW 20) | b46309a2 pool: 84 (Day 6)
- Curator integrity: 0/101 | Dupes: 0 | Injections: 0 | Security: 0
- Genre: **reggae=39 [CRITICAL]** | alternative=0 [MISSING] | imbalance=8.1x

## Issues
1. **Reggae 39 — CRITICAL** (-11 today, declining ~3-4d to zero at current rate)
2. **alternative MISSING** — 0 entries
3. **Imbalance 8.1x** — worst recorded; thin genres (country 43, world 51, k-pop 53) next
4. **Freshness 13.5%** — below 30% target
5. **b46309a2 Day 6** — 84 pool entries unreviewed
6. **WW daily cap recurring** — 20/day vs cap 10
7. **Curator monthly cap** — Calvin Day 4 overdue

## Next Actions
- **Curator (CRITICAL)**: Emergency reggae fill before exhaustion (~3d). Alt/country/world/k-pop also needed.
- **Calvin (Day 6)**: b46309a2 policy — 84 entries in pool
- **Calvin (Day 4)**: Monthly cap retroactivity + afrobeats classification
- **CEO**: Enforce WW daily cap; notify curators of monthly cap
- **QA**: On Calvin hold → retire 84 b46309a2 entries
