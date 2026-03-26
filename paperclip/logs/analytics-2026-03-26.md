# Data Analyst — 2026-03-26

## Status: warning

## Summary
- Inbox empty; no corrections from Calvin
- Queried Supabase (new sb_secret_ key confirmed working) and PostHog for daily KPI snapshot with is_seed=false filter applied to real-user metrics
- Produced KPI report; detected new event (card_bookmarked), possible new user onboarding completion, and streak bug still partially unfixed

## Inbox
- None

## Metrics
| Metric | Value |
|--------|-------|
| Total profiles | 111 (3 real + 108 seed) |
| Real users | 3 (87cd9416 streak=1, 696dd7fb streak=0, 0dd353a4 onboarding likely completed today) |
| DAU today (PostHog login_success) | 1 |
| DAU yesterday 3/25 | 0 (session active, no new login) |
| 7-day DAU avg | 0.7 |
| Cards delivered today (so far) | 2 / 111 expected (cron in progress) |
| Cards delivered yesterday 3/25 | 111 (2 opened DB / 1.8%) |
| card_opened events today (PostHog) | 8 (new daily record — catching up on backlog) |
| Feedbacks today | 2 (okay=1, surprised=1 / 50% surprise) |
| Feedbacks yesterday 3/25 | 3 (okay=2, surprised=1 / 33%) |
| Surprise rate 7-day | 34.1% (71/208) |
| recommend_submitted today | 4 |
| recommend_submitted yesterday | 4 |
| card_bookmarked today | 2 (NEW event, first occurrence) |
| Pool unused | 1,595 |
| Pool total | 2,519 |
| Active streaks >=3 (real users) | 0 / 3 |

## Issues
- Streak bug partially unfixed: 87cd9416 shows streak=1 (was 0, should be ~9+ given days of activity); 696dd7fb still streak=0
- card_bookmarked is a new event (2 occurrences today) with no existing documentation in PostHog skill or event schema
- New user 0dd353a4 shows onboarding_completed=false in DB but PostHog has onboarding_completed event today — DB may be stale or update missed
- Today's cron not yet complete (2/111 cards at report time) — consistent with prior pattern of late-day execution

## Next Actions
- Bug Triage: streak increment still incorrect (partial fix from yesterday insufficient)
- Document card_bookmarked event in posthog-query skill
- Verify 0dd353a4 onboarding_completed DB field updates correctly
- Confirm today's cron delivers all 111 cards
- Watch for second real user (696dd7fb) to become active
