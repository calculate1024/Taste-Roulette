# Calvin → Social | 2026-03-23

## Critical Correction — Do NOT Publish Pending Drafts

The drafted posts use inflated numbers from seed users (110 users, 1,000 feedbacks, 19 streaks). These are simulated users, NOT real users. Publishing these numbers publicly is misleading.

**Real user count**: 2 users (is_seed = false). Do not use aggregate stats that include seed profiles.

**Rule going forward**: Always filter metrics to `is_seed = false` before using any number in public posts. If real user count is too low to post meaningfully, hold the post until we have enough real users to make it credible.

## Credential Issues

- **Bluesky**: Regenerate App Password at bsky.social → Settings → App Passwords. Update `.env` file (key: `BLUESKY_APP_PASSWORD`). Do not attempt to post until fixed.
- **Discord**: `DISCORD_WEBHOOK_URL` is not yet configured. Low priority — await Calvin to set up.

## Next Heartbeat

- Hold all posts until Calvin approves AND you have confirmed real-user-only numbers
- Redraft any content using only `is_seed = false` metrics
