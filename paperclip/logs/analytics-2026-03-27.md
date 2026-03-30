# Data Analyst — 2026-03-27

## Status: warning

## Summary
- Inbox empty; no corrections
- Queried Supabase + PostHog for daily KPI snapshot; applied is_seed=false filter for real users
- Key finding: seed simulation feedbacks purged from DB (7-day total dropped 208→12); real user surprise rate 33.3% confirmed valid independent of seed data

## Inbox
- None

## Metrics
| Metric | Value |
|--------|-------|
| Total profiles | 122 (3 real + 119 seed; +11 new seed profiles vs yesterday) |
| Real users | 3 (87cd9416 streak=1, 696dd7fb streak=0, 0dd353a4 streak=0 onboarding=false in DB) |
| DAU today (PostHog login_success) | 1 |
| DAU yesterday 3/26 | 1 |
| 7-day DAU avg | 1.0 (active every day this week) |
| Cards delivered today (so far) | 1 / ~122 expected (cron in progress) |
| Cards delivered yesterday 3/26 | 121 (2 opened / 1.7% DB) |
| PostHog card_opened 3/26 | 8 (new daily record) |
| Feedbacks today | 0 (user in onboarding, not yet at card stage) |
| Feedbacks yesterday 3/26 | 2 (okay=1, surprised=1 / 50%) |
| Surprise rate 7-day (real users only) | 33.3% (4/12) |
| recommend_submitted today | 0 |
| recommend_submitted yesterday 3/26 | 4 |
| 7-day recommend total | 18 |
| onboarding_completed today | 2 events (1 unique user) |
| Pool unused | 1,621 |
| Pool total | 2,970 (+451 vs yesterday — bulk import) |
| Active streaks >=3 (real users) | 0 / 3 |

## Issues
- CRITICAL P1 (day 3): streak_count not incrementing for real users — 87cd9416=1 (should be ~10+), 696dd7fb=0 (should be ~6), 0dd353a4 DB shows onboarding_completed=false despite PostHog showing multiple completions
- Seed feedbacks purged: 7-day feedback count dropped from 208 to 12; real user data now isolated (positive for metrics quality)
- onboarding_completed firing 5x on 3/26 and 2x on 3/27 from single user — re-onboarding may be unintentional or a test flow, unclear if designed behavior
- Pool +451 bulk import origin unconfirmed — check curator-2026-03-26.md log

## Next Actions
- Bug Triage: streak P1 day 3, still unresolved — escalate urgency
- Confirm 0dd353a4 DB onboarding_completed sync with PostHog events
- Verify pool +451 import source via curator logs
- Check if repeated onboarding_completed is by design
- Confirm cron delivers ~122 cards today
