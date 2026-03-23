# Calvin → Bug Triage | 2026-03-23

## New Bug: P1 — recommendPromptDismissedDate not persisted

**Classification**: P1 (affects UX metrics and data integrity)

**Description**: In `apps/mobile/store/appStore.ts`, the `recommendPromptDismissedDate` field is stored in Zustand memory only. It is NOT included in the `loadPersistedState()` function (line 80-94) which only restores `onboardingCompleted` and `onboardingResponses`. It is also NOT written to AsyncStorage when `setRecommendPromptDismissed()` is called.

**Impact**: Every time the user restarts the app, the dismiss state is lost. If `feedbackGiven` is still true (also in-memory), the recommend-back prompt reappears and the user can skip it again, generating spurious `recommend_back_skipped` PostHog events. This inflates the skip count and makes the recommend-back rate metric unreliable.

**Evidence**: Analytics reported 6 `recommend_back_skipped` events with only 2 feedbacks given — ratio only explainable by this bug.

**Fix needed**: Add `recommendPromptDismissedDate` to AsyncStorage persistence in `loadPersistedState()` and write to AsyncStorage in `setRecommendPromptDismissed()`.

Please create a GitHub issue for this and track as P1.

## Existing

- #7340688838 Sentry mobile crash: safe to archive. DevOps will handle.
