# Data Analyst — 2026-03-28

## Status: warning

## Summary
- Inbox empty; no corrections from Calvin
- Queried Supabase + PostHog for daily KPI snapshot; real users filtered with is_seed=false
- Surprise rate 7-day jumped to 55.6% (n=9 pure real user feedbacks); zero not_for_me in last 7 days — strong algorithm signal

## Inbox
- None

## Metrics
| Metric | Value |
|--------|-------|
| Total profiles | 122 (3 real + 119 seed; unchanged) |
| Real users | 3 (87cd9416 streak=1, 696dd7fb streak=0, 0dd353a4 onboarding=false DB) |
| DAU today login_success | 0 (session active, no new login) |
| DAU today actual activity | 1 (6 PostHog events: card_opened×2, card_viewed×2, feedback×1) |
| DAU yesterday 3/27 | 1 |
| 7-day DAU avg (login_success) | 0.7 |
| Cards today (DB) | 0 (cron not yet run) |
| Cards yesterday 3/27 | 121 (1 opened / 0.8% DB) |
| PostHog card_opened today | 2 (backlog cards from prior days) |
| Feedbacks today | 1 (surprised=1 / 100%) |
| Feedbacks yesterday 3/27 | 0 |
| Surprise rate 7-day (3/21→now) | 55.6% (5/9) — no not_for_me in 7 days |
| recommend_submitted today | 0 |
| 7-day recommend total | 10 |
| Pool unused | 1,690 (+69 vs yesterday) |
| Pool total | 3,060 (+90 vs yesterday) |
| Pool days remaining | ~13.8 days (1690 / 122 users) |
| Active streaks >=3 (real) | 0 / 3 |

## Issues
- CRITICAL P1 (day 4): streak_count not incrementing for real users — 87cd9416=1 (should be >=11), 696dd7fb=0 (should be >=7), 0dd353a4 DB onboarding_completed=false (PostHog shows 6+ completions since 3/24)
- DAU metric split: login_success=0 today but user clearly active (6 events) — session persistence masks true DAU; need broader DAU definition
- 0dd353a4 onboarding_completed DB vs PostHog mismatch persists (day 4) — card delivery for this user may be affected

## Next Actions
- Bug Triage: streak P1 day 4 — must close today; consider direct DB patch + code fix in parallel
- Fix 0dd353a4 onboarding_completed sync (DB=false, reality=true)
- Propose DAU definition update to Calvin: login_success OR any of {card_opened, feedback_given, recommend_submitted}
- Confirm today's cron delivers ~122 cards
- Watch for 696dd7fb to appear in PostHog events (second real user engagement unknown)
