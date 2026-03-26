# Data Analyst — 2026-03-25

## Status: warning

## Summary
- Read and acted on inbox (analytics.md): confirmed PostHog login_success as primary DAU signal; recommend_back_skipped bug acknowledged as P1
- Queried Supabase (profiles with is_seed filter, roulette_cards by day, feedbacks by day, pool) and PostHog (HogQL DAU, events by day, signup events) for daily KPI snapshot
- Detected new real user signup on 3/24, streak_count=0 bug for all real users, and cron not yet run today

## Inbox
- Calvin confirmed: use PostHog login_success as DAU (implemented)
- Calvin confirmed: recommend_back_skipped P1 bug (AsyncStorage not persisting dismiss state) — escalated to Bug Triage
- Applied is_seed=false filter for real-user metrics going forward

## Metrics
| Metric | Value |
|--------|-------|
| Total profiles | 111 (3 real + 108 seed) |
| Real users | 3 (87cd9416, 696dd7fb, 0dd353a4-NEW) |
| DAU today (PostHog login_success) | 0 (cron/user not yet active) |
| DAU yesterday 3/24 | 1 |
| 7-day DAU avg | 0.7 |
| Cards today 3/25 | 0 (cron not yet run) |
| Cards yesterday 3/24 | 110 (1 opened / 0.9% DB open rate) |
| PostHog card_opened 3/24 | 2 (real user) |
| Feedbacks today | 0 |
| Feedbacks yesterday 3/24 | 1 (surprised=1 / 100%) |
| Surprise rate 7-day | 30.8% (271/880) |
| Pool unused | 1,600 (growing +~20/day) |
| Pool total | 2,505 |
| Active streaks >=3 (all DB) | 40/111 (all seed users) |
| New signups 3/24 | 1 (onboarding not yet completed) |

## Issues
- CRITICAL: All 3 real users have streak_count=0 despite days of activity — streak increment logic not firing in app flow (only in seed script). Needs Bug Triage investigation.
- New user 0dd353a4 signed up 2026-03-24T23:04 but onboarding not completed — no taste_vector yet, may affect card matching today
- Today's cron not yet run (0 cards for 3/25) — consistent with 3/23 pattern where cron ran late in the day
- recommend_back_skipped P1 bug confirmed and escalated (not resolved yet)

## Next Actions
- Bug Triage: investigate streak_count not incrementing for real users
- Monitor: check if new user 0dd353a4 completes onboarding today
- Confirm: today's cron runs successfully (check cards created >= 2026-03-25T00:00:00Z later today)
- Watch: 3/25 surprise rate and open rate once user activity resumes
