# Social Media Manager — 2026-03-23
## Status: warning

## Summary
- Queried Supabase for anonymized daily stats (110 users, 1000 feedbacks, 19 x 7-day streaks)
- Drafted 3 posts for Twitter/X, Instagram, Threads — awaiting Calvin approval
- Bluesky auto-post BLOCKED: AuthenticationRequired — credentials need rotation

## Metrics
| Metric | Value |
|--------|-------|
| Total users | 110 |
| 7-day streak users | 19 (17.3%) |
| Surprise rate | 27.3% (KPI target: 25% ✓) |
| Sweet spot hit rate | 89.9% |
| Avg taste distance | 0.532 |

## Issues
- **Bluesky credentials invalid** — BLUESKY_APP_PASSWORD in .env returns AuthenticationRequired. Calvin needs to regenerate App Password at bsky.social → Settings → App Passwords.
- **Discord webhook not configured** — DISCORD_WEBHOOK_URL missing from .env. Cannot auto-post to Discord until configured.

## Next Actions
- Calvin to review and approve Twitter/X, IG, Threads drafts (see conversation)
- Calvin to rotate Bluesky App Password and update .env
- Calvin to configure DISCORD_WEBHOOK_URL in .env for future auto-posts
