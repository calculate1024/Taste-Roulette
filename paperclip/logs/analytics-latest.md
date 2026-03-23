# Data Analyst — 2026-03-23

## Status: error

## Summary
- Queried Supabase (profiles, roulette_cards, feedbacks, user_recommendations, auth.users) and PostHog (HogQL 7-day events) for daily KPI snapshot
- Detected critical anomaly: 0 cards delivered today (daily cron job appears to have failed)
- Produced full KPI report including DoD comparison and 7-day trends

## Metrics
| Metric | Value |
|--------|-------|
| Total profiles | 110 (1 real + 1 curator-system + 108 seed) |
| DAU today (PostHog) | 0 |
| DAU yesterday (PostHog) | 1 (active via session, no new login_success) |
| Cards delivered today | 0 (CRITICAL — cron failure suspected) |
| Cards delivered yesterday | 110 (1 opened / 0.9% open rate DB-wide) |
| Real user card_opened yesterday (PostHog) | 2 |
| Feedbacks today | 0 |
| Feedbacks yesterday | 2 (surprised=1, okay=1 / 50% surprise rate) |
| Surprise rate 7-day | 30.7% (270/879) |
| Recommend-back rate yesterday | 25% (2 submitted / 8 prompts shown) |
| recommend_back_skipped yesterday | 6 (anomaly) |
| Pool unused | 1,587 (healthy, growing) |
| Pool total | 2,454 |
| Active streaks >=3 | 40 / 110 users |

## Issues
- CRITICAL: 0 cards created on 2026-03-23 — daily cron job did not run or failed silently
- recommend_back_skipped=6 with only 2 feedbacks suggests prompt is showing multiple times per session (possible bug)
- DAU metric unreliable from auth.last_sign_in due to session persistence; PostHog login_success is more accurate
- All behavioral data still from single real user; no statistical baseline possible

## Next Actions
- Immediately: manually trigger card delivery for today, investigate cron failure
- Bug triage: inspect recommend_back_skipped trigger logic (6 skips / 2 feedbacks ratio abnormal)
- Update DAU tracking to use PostHog login_success instead of auth.last_sign_in
- Recruit beta users to establish multi-user baseline
