# PostHog Query Skill

## Purpose
Query PostHog analytics to extract product KPIs and user behavior data.

## Context
Taste Roulette uses PostHog for event tracking. Key events are captured from
the mobile app and API. This skill queries PostHog to produce KPI snapshots.

## PostHog Events Reference

| Event | Source | Properties |
|-------|--------|------------|
| `app_opened` | Mobile | `user_id`, `platform` |
| `card_delivered` | API | `user_id`, `card_id`, `taste_distance` |
| `card_opened` | API | `user_id`, `card_id` |
| `feedback_given` | API | `user_id`, `reaction`, `card_id` |
| `recommendation_submitted` | API | `user_id`, `track_id` |
| `onboarding_completed` | API | `user_id`, `method` (spotify/recognize) |
| `streak_updated` | API | `user_id`, `streak_count` |
| `badge_unlocked` | API | `user_id`, `badge_id` |

## Common Queries

### Daily Active Users (DAU)
```
POST /api/projects/{project_id}/insights/trend/
{
  "events": [{"id": "app_opened", "math": "dau"}],
  "date_from": "-7d"
}
```

### Open Rate
```
card_opened count / card_delivered count (same day)
```

### Surprise Rate (7-day rolling)
```
feedback_given WHERE reaction='surprised' / total feedback_given
```

### Retention Cohort
```
POST /api/projects/{project_id}/insights/retention/
{
  "target_entity": {"id": "app_opened"},
  "returning_entity": {"id": "app_opened"},
  "period": "Day",
  "retention_type": "retention_first_time"
}
```

### Onboarding Funnel
```
Step 1: onboarding_started
Step 2: onboarding_completed
Step 3: first card_opened
Step 4: first feedback_given
```

## Authentication
```
Authorization: Bearer {POSTHOG_PERSONAL_API_KEY}
Base URL: https://app.posthog.com (or self-hosted URL)
```

## Output Format
Return data as structured JSON for report-generation skill to format.
Include raw numbers and calculated percentages.
Always include comparison with previous period (day-over-day or week-over-week).
