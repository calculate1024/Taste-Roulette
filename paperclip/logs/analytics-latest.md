# Data Analyst — 2026-03-29

## Status: warning

## Summary
- Inbox empty; no corrections from Calvin
- Queried Supabase + PostHog for daily KPI snapshot; real users filtered with is_seed=false
- Surprise rate 7-day hit 60.0% (n=10, new high); recommend_submitted×2 today — genuine user engagement signal
- Streak P1 day 5: 87cd9416 streak=2 (+1 confirmed working), 696dd7fb streak=0 still stuck

## Inbox
- None

## Metrics
| Metric | Value |
|--------|-------|
| Total profiles | 122 (3 real + 119 seed; unchanged) |
| Real users | 3 (87cd9416 streak=2, 696dd7fb streak=0, 0dd353a4 onboarding=false) |
| DAU today login_success | 0 (session persistent; no new login needed) |
| DAU today actual activity | 1 (14 PostHog events confirmed) |
| DAU yesterday 3/28 | 0 login_success; 1 event-based |
| Cards today (DB, cron in progress) | 1 (final ~121 expected) |
| Cards yesterday 3/28 | 121 delivered, 1 opened (0.8%) |
| Feedbacks today 3/29 | 1 (surprised=1 / 100%) |
| Feedbacks yesterday 3/28 | 1 (surprised=1 / 100%) |
| Surprise rate 7-day (3/22-3/29) | 60.0% (6/10) — zero not_for_me 8 days |
| recommend_submitted today | 2 (new high) |
| Pool unused | 1,685 (-5 consumed) |
| Pool total | 3,162 (+102 new tracks) |
| Pool days remaining | ~13.9 days |
| Active streaks >=3 (real) | 0 / 3 |

## PostHog 今日事件 (3/29)
card_opened×4, card_viewed×3, recommend_submitted×2, feedback_given×1, profile_viewed×1, recommend_back_pressed×1, recommend_track_selected×1, card_feedback_submitted×1 — Total: 14

## Issues
- CRITICAL P1 (day 5): 696dd7fb streak=0 (still stuck); 87cd9416 streak=2 (fix working going forward)
- 0dd353a4 onboarding_completed DB=false vs PostHog events (day 5); card delivery may be affected
- Open rate 0.8% on 3/28 (1/121); needs monitoring
- DAU login_success=0 daily due to session persistence; extended definition pending Calvin approval

## Next Actions
- Bug Triage: streak P1 day 5 — why does 696dd7fb not increment while 87cd9416 now does?
- Bug Triage: 0dd353a4 onboarding sync still unresolved (day 5)
- CEO briefing: recommend_submitted×2 today is a positive engagement signal
- Await cron completion to confirm final cards delivered count
