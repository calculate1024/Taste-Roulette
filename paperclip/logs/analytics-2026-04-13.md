# Data Analyst — 2026-04-13

## Status: warning

## Inbox
No `paperclip/inbox/analytics.md` found — no instructions to process.

## Summary
- Queried Supabase for full KPI snapshot; PostHog unavailable (project API key `phc_` cannot authenticate to REST API — ongoing limitation)
- Real user count updated: **6 real users** (up from 3 on 2026-03-29); 3 actively engaged (streak ≥ 1, onboarding complete), 3 inactive/incomplete
- Zero feedbacks in last 8 days (2026-04-06 to 2026-04-13); no engagement activity from new users 620c24da, 65ff10cc, or 80d73fe3 post-join

## Metrics

### Daily KPI Snapshot — 2026-04-13
| Metric | Today | Yesterday (4/12) | 14-day avg | Target |
|--------|-------|-----------------|------------|--------|
| Real Users (total) | 6 | 6 | — | 50 (month1) |
| Active Users (onboarded + streak≥1) | 3 | 3 | — | — |
| DAU (PostHog) | N/A | N/A | N/A | — |
| DAU (DB proxy: card opens) | 0 (cron not yet) | 1 (87cd9416) | ~1 | — |
| Cards delivered today | 0 (cron at 13:00 UTC) | 123 | ~90/day | — |
| Open rate today batch | N/A | 0% (0/123) | ~1-2% | 60% |
| Surprise rate 7d | N/A (0 feedbacks) | — | — | 25% |
| Surprise rate 14d | 40% (4/10, n=10) | — | — | 25% |
| Pool unused | 1,047 | ~1,089 | — | 200+ |
| Pool consumption rate | ~42.5/day | — | — | — |
| Pool days remaining | ~24.6 days | — | — | — |

### User Profiles (is_seed=false)
| User ID (truncated) | Streak | Onboarding | Joined | Status |
|--------------------|--------|------------|--------|--------|
| 87cd9416 | 1 | ✅ | 2026-03-17 | Active (streak regression: was 2 on 3/29) |
| 696dd7fb | 0 | ✅ | 2026-03-21 | Curator System (service acct) |
| 0dd353a4 | 0 | ❌ | 2026-03-24 | Stuck — onboarding not completed (day 20+) |
| 620c24da | 1 | ✅ | 2026-03-29 | Active — no feedback yet |
| 65ff10cc | 1 | ✅ | 2026-04-01 | Active — no feedback yet |
| 80d73fe3 | 0 | ❌ | 2026-04-01 | Stuck — onboarding not completed (day 12) |

### Feedback Analysis
| Window | Total | Surprised | Okay | Not For Me | Surprise Rate |
|--------|-------|-----------|------|------------|---------------|
| Last 7d (4/6–4/13) | 0 | — | — | — | N/A |
| Last 14d (3/30–4/13) | 10 | 4 | 5 | 1 | 40.0% |
| All-time (capped at 1,568 per DevOps) | 1,568 | ~466 est | ~676 est | ~426 est | ~29.7% est |

Note: All-time feedback count 1,568 includes seed user activity; real-user-only data is small-n (last confirmed: n≤20 all-time).

### Pool Health
| Metric | Value | Notes |
|--------|-------|-------|
| Total recommendations | 4,196 | |
| Unused pool | 1,047 | Down 638 from 1,685 on 3/29 |
| Consumption since 3/29 (15d) | 638 consumed | 42.5/day avg |
| Days remaining at current rate | ~24.6 days | |
| Tracks total | 5,111 | Up 1,654 since 3/30 (DevOps) |
| Pool freshness (7d) | 29.6% | ⚠️ Slightly below 30% target |

### Card Delivery Pattern (last 7 days)
| Date | Cards Created | Opened | Open Rate |
|------|--------------|--------|-----------|
| 2026-04-07 | 12 | 0 | 0% |
| 2026-04-08 | 1 | 0 | 0% |
| 2026-04-09 | 1 | 0 | 0% |
| 2026-04-10 | 3 | 0 | 0% |
| 2026-04-11 | 2 | 2 | 100% (87cd9416, opened 4/12) |
| 2026-04-12 | 123 | 0 | 0% (batch pending) |
| 2026-04-13 | 0 | 0 | N/A (cron fires 13:00 UTC) |

Note: 4/7-4/11 low card counts may indicate cron irregularity; 4/12 restored to 123.

## Issues

### 🚨 P0 — Zero feedbacks in 8 days (2026-04-06 to 2026-04-13)
- Last feedback was 2026-04-05. Three active users (87cd9416, 620c24da, 65ff10cc) but no feedback activity.
- Possible causes: (a) open rate near 0% means cards not being seen, (b) feedback flow broken, (c) users inactive.
- Cards from 4/11 batch opened by 87cd9416 on 4/12 — no feedback submitted.
- **Escalate to CEO / dev**: Is the feedback submission flow working?

### 🚨 P0 (ongoing) — Real users: 6 vs Month 1 target: 50
- CEO report had stale count of 3; updated to 6 as of today.
- Growth rate: ~0.2 users/day over last 15 days — well below needed rate.
- New users: 2 remain stuck in onboarding (0dd353a4 day 20+, 80d73fe3 day 12).

### ⚠️ P2 — 87cd9416 streak regression: 2 → 1
- On 3/29 streak=2; now streak=1. Either missed a day or streak-decrement bug.
- This user is the most engaged — worth investigating.

### ⚠️ P2 — PostHog API unavailable (ongoing)
- Project key (`phc_`) cannot authenticate to PostHog REST API (requires personal API key `phx_`).
- DAU and funnel metrics unavailable via PostHog. Using DB proxy metrics only.
- Recommend: Add PostHog personal API key to `.env` as `POSTHOG_PERSONAL_API_KEY`.

### ⚠️ P2 — 2 users stuck in onboarding (0dd353a4, 80d73fe3)
- 0dd353a4: stuck since 2026-03-24 (day 20+); 80d73fe3: stuck since 2026-04-01 (day 12).
- These users will not receive cards until onboarding is completed.

### ℹ️ P3 — Cron irregularity (4/7–4/11)
- Card counts dropped to 1-12/day (vs expected 123) from 4/7-4/11, then restored 4/12.
- Not flagged by DevOps. Worth verifying cron logs.

### ℹ️ P3 — b46309a2 seed user bulk-submitted 60 recommendations on 4/12 at 22:31 UTC
- 60 recommendations in ~15 seconds — automated/script activity from seed user.
- This is likely the `curator-targeted-expand.ts` or pool-filling script. Noted for transparency.

## Anomaly Checks (>20% day-over-day)
- Feedbacks: 0 today vs 0 yesterday — no change (sustained zero, critical)
- Open rate: could not compute (no feedback window data)
- Pool: -42.5/day consumption rate — steady, no anomaly

## Next Actions
1. **CEO briefing**: Real user count now 6 (not 3); zero feedbacks in 8 days is critical signal
2. **Dev investigation**: Check feedback submission flow — are cards openable but feedback not submittable?
3. **Dev/CEO**: Onboarding dropout — 2 users stuck; consider onboarding completion funnel review
4. **DevOps**: Verify cron execution logs for 4/7-4/11 anomaly (12→1→1→3→2 cards)
5. **Analytics**: Add `POSTHOG_PERSONAL_API_KEY` to `.env` for proper DAU/funnel tracking
6. **CEO**: Confirm cron fires today at 13:00 UTC as expected; update real user count in CEO report
