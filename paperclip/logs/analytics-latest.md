# Data Analyst — 2026-04-13

## Status: warning

## Summary
- Queried Supabase for full KPI snapshot; PostHog unavailable (project API key `phc_` cannot authenticate to REST API — ongoing limitation)
- Real user count updated: **6 real users** (up from 3 on 2026-03-29); 3 actively engaged (streak ≥ 1, onboarding complete), 3 inactive/incomplete
- Zero feedbacks in last 8 days (2026-04-06 to 2026-04-13); no engagement activity from new users post-join

## Inbox
- None

## Metrics
| Metric | Value |
|--------|-------|
| Total profiles | 125 (6 real + 119 seed) |
| Real users (is_seed=false) | 6 (up from 3 on 3/29) |
| Active users (onboarded + streak≥1) | 3 (87cd9416 streak=1, 620c24da streak=1, 65ff10cc streak=1) |
| Stuck users (onboarding incomplete) | 2 (0dd353a4 day 20+, 80d73fe3 day 12) |
| DAU today (DB proxy) | 0 (cron not yet fired — 13:00 UTC) |
| DAU yesterday (4/12) | 1 (87cd9416 opened 2 cards from 4/11 batch) |
| Cards today (4/13) | 0 (cron fires 13:00 UTC) |
| Cards yesterday (4/12) | 123 delivered, 0 opened (batch pending) |
| Feedbacks last 7d (4/6–4/13) | 0 — CRITICAL drop |
| Feedbacks last 14d (3/30–4/13) | 10 (4 surprised, 5 okay, 1 not_for_me) |
| Surprise rate 7d | N/A (0 feedbacks) |
| Surprise rate 14d | 40.0% (4/10, n=10) |
| Pool unused | 1,047 (down 638 from 1,685 on 3/29) |
| Pool consumption rate | ~42.5/day (15d avg) |
| Pool days remaining | ~24.6 days |
| Tracks total | 5,111 |
| PostHog | ❌ Auth failed (project key; need personal key) |

## Issues
- CRITICAL: Zero feedbacks in 8 days (4/6–4/13) — engagement stall; feedback flow may be broken
- CRITICAL: 6 real users vs 50 month1 target (CEO had stale count of 3)
- P2: 87cd9416 streak regression 2→1; most engaged user
- P2: PostHog API unavailable (ongoing) — no DAU funnel data
- P2: 2 users stuck in onboarding
- P3: Cron produced 1–12 cards/day on 4/7–4/11 (vs expected 123); restored 4/12

## Next Actions
- Dev: Investigate feedback submission flow (cards openable, no feedback following)
- CEO: Update real user count to 6; 8-day feedback gap needs attention
- DevOps: Verify cron logs for 4/7–4/11 low card counts
- Analytics: Add POSTHOG_PERSONAL_API_KEY to .env for proper tracking
- Dev/CEO: Onboarding dropout review (2 stuck users)
