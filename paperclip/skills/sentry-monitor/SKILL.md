# Sentry Monitor Skill

## Purpose
Monitor application errors via Sentry, classify severity, and create actionable reports.

## Context
Taste Roulette uses Sentry for error tracking across the API (Vercel) and mobile app (Expo).
This skill queries the Sentry API to identify, classify, and triage errors.

## Sentry Projects
- `taste-roulette-api` — Node.js/Express API on Vercel
- `taste-roulette-mobile` — React Native (Expo) app

## Procedure

### 1. Fetch Recent Issues
```
GET /api/0/projects/{org}/{project}/issues/?query=is:unresolved&sort=freq
Authorization: Bearer {SENTRY_AUTH_TOKEN}
```

### 2. Classify Each Issue

**P0 — Critical (fix within 1 hour):**
- Auth flow errors (signup, login, token refresh)
- Daily matching failure (cron job errors)
- Database connection errors
- Data corruption (malformed taste vectors)

**P1 — High (fix within 24 hours):**
- Feedback submission failures
- Push notification delivery errors
- Spotify API integration errors (embed, search)
- Onboarding flow errors

**P2 — Medium (fix within 1 week):**
- UI rendering errors (specific devices/OS versions)
- Non-critical API endpoint errors
- Performance degradation (slow queries)
- Third-party API rate limiting

**P3 — Low (backlog):**
- Cosmetic issues
- Edge case warnings
- Deprecation notices

### 3. Create GitHub Issues (P0-P1)
```
POST /repos/{owner}/{repo}/issues
{
  "title": "[P{level}] {error_title}",
  "body": "## Error\n{message}\n\n## Stack Trace\n```\n{stacktrace}\n```\n\n## Impact\n- Affected users: {count}\n- First seen: {date}\n- Frequency: {events}/day\n\n## Suggested Fix\n{analysis}",
  "labels": ["bug", "p{level}"]
}
```

### 4. Report
```
Error Triage — {date}
- New issues: {n}
- P0: {n} (action: {status})
- P1: {n} (action: {status})
- P2: {n}
- P3: {n}
- Resolved since last check: {n}
```

## Sentry API Reference
```
Base URL: https://sentry.io/api/0/
Auth: Bearer token
Rate limit: 100 requests/min
```
