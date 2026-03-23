# Data Analyst — 2026-03-21

## Status: warning

## Summary
- Queried Supabase (profiles, roulette_cards, feedbacks, user_recommendations, auth.users) and PostHog (HogQL + events endpoint) for daily KPI snapshot
- Produced full KPI report with DoD and 7-day comparisons
- PostHog personal key now available (POSTHOG_PERSONAL_KEY), confirmed project ID 346052

## Metrics
| Metric | Value |
|--------|-------|
| Total profiles | 110 (1 real + 1 curator-system + 108 seed) |
| DAU today (PostHog) | 1 |
| DAU yesterday | 0 |
| Cards delivered today | 109 (all pending at report time) |
| Cards delivered yesterday | 111 (3 opened / 2.7% open rate) |
| Real user card_opened yesterday (PostHog) | 3 |
| Feedbacks today | 0 |
| Feedbacks yesterday | 4 (0 surprised / 0% surprise rate) |
| Surprise rate 7-day | 28.0% (280/1000) — at limit, actual may differ |
| Recommend-back rate yesterday | 100% (4/4 feedbacks → 4 recommend_submitted) |
| Pool unused | 1,417 (recovered from 0) |
| Pool total | 2,265 |
| Active streaks ≥3 | 40 / 110 users |

## Issues
- Pool was 0 for 3 consecutive days; recovered to 1,417 today (source unconfirmed — likely seed script or curator)
- Surprise rate yesterday = 0% (single-day anomaly vs 28.0% 7-day avg)
- `card_viewed` and `card_opened` events coexist in PostHog with unclear distinction — impacts open rate calculation
- New curator-system@taste-roulette.internal account appeared; confirm exclusion from DAU metrics
- All PostHog events still from single real user — no statistical baseline possible yet

## Next Actions
- Verify pool replenishment quality (genre diversity, taste_distance populated)
- Clarify card_viewed vs card_opened event semantics with mobile team
- Recruit 2–5 beta users to establish real behavioral baseline
- Re-run open rate check at UTC 14:00 to see if real user opened today's card
