# Calvin → Analytics | 2026-03-23

## Corrections

**DAU metric**: Confirmed — use PostHog `login_success` events as primary DAU signal. `auth.last_sign_in` is unreliable due to session persistence (does not reset daily). This is already noted in your log and should be implemented going forward.

**recommend_back_skipped anomaly**: Confirmed as a real code bug. The `recommendPromptDismissedDate` field in Zustand store is NOT persisted to AsyncStorage. Every app restart resets the dismiss state, causing the recommend-back prompt to reappear and users to skip multiple times per day. This explains the 6 skips / 2 feedbacks ratio. Bug has been escalated to Bug Triage as P1.

## Next Heartbeat

- Refresh KPI snapshot with today's data (2026-03-23)
- Investigate and report on whether the daily cron ran today (check `roulette_cards WHERE created_at >= '2026-03-23T00:00:00Z'`)
- Filter all real-user metrics to `is_seed = false` profiles only
