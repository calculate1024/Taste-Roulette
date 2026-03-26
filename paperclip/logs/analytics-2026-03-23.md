# Data Analyst — 2026-03-23

## Status: warning

## Summary
- Inbox read and actioned: (1) DAU metric switched to PostHog login_success; (2) recommend_back_skipped P1 bug acknowledged (AsyncStorage persistence missing); (3) real-user filtering via is_seed=false now in use
- Queried Supabase + PostHog for full KPI snapshot; cron job confirmed as running today (21:59 UTC+8, 13h late, 220 cards = ~2x normal — possible double dispatch)
- Detected 2 new real users (is_seed=false total: 3, up from 1)

## Inbox
- File: paperclip/inbox/analytics.md (2026-03-23, from Calvin)
- Actions taken:
  - DAU now uses PostHog login_success (not auth.last_sign_in)
  - recommend_back_skipped bug noted as P1, escalated to Bug Triage by Calvin
  - Cron investigation completed (see Issues)
  - All real-user metrics filtered to is_seed=false

## Metrics
| Metric | Value |
|--------|-------|
| Total profiles | 111 (3 real + 108 seed) |
| DAU today (PostHog login_success) | 1 (session active on 2026-03-24 UTC) |
| DAU yesterday (3/22) | 0 login_success (active via session) |
| Cards delivered today (3/23) | 220 (anomaly: ~2x expected, cron ran 13h late at 21:59 UTC+8) |
| Cards delivered yesterday (3/22) | 110 (1 opened / 0.9% DB open rate) |
| Real user card_opened today (PostHog) | 2 |
| Feedbacks today | 1 (surprised / 100%) |
| Feedbacks yesterday (3/22) | 2 (surprised=1, okay=1 / 50%) |
| Surprise rate 7-day | 30.8% (271/880) |
| recommend_back_skipped yesterday | 6 (P1 bug confirmed) |
| Pool unused | 1,600 (+92/day avg, healthy) |
| Pool total | 2,505 |
| Active streaks >=3 | 40 / 111 users |

## Issues
- Cards today = 220 (2x expected 111): cron may have double-run; delivery time was 21:59 UTC+8 (13h late vs 09:00 schedule) — needs DevOps investigation
- recommend_back_skipped=6 on 3/22: P1 bug (recommendPromptDismissedDate not persisted to AsyncStorage), escalated by Calvin
- DAU remains 1 real user active; 3 real users total but 2 are new and have not engaged yet

## Next Actions
- DevOps: confirm whether cron ran twice today (double dispatch root cause)
- Bug Triage: P1 fix for recommend_back_skipped — persist dismissedDate to AsyncStorage
- Analytics: monitor new real users (3 total) for first card_opened event to track onboarding completion
- Continue using PostHog login_success as DAU signal going forward
