# Cold Start Execution Plan

> Created: 2026-03-27
> Goal: 0 → 80 real users in 4 weeks
> Strategy: Weekly milestones, automation-first

## Current State

- Real users: 3
- Distribution: Google Play internal test (manual email invite)
- Social: Twitter @tasteroulette, Bluesky, Discord
- Content pool: 1,595 unused tracks (~10 days)
- Known bugs: streak_count=0, recommend_back persistence

## Weekly Milestones

| Week | Date | Users | Key Actions | Owner |
|------|------|-------|-------------|-------|
| W1 | 3/27 - 4/2 | 3 → 15 | Open Testing upgrade, Reddit #1, fix streak bug | Calvin + Agents |
| W2 | 4/3 - 4/9 | 15 → 30 | Reddit #2, curator outreach sent, Twitter threads | Agents (Calvin approves) |
| W3 | 4/10 - 4/16 | 30 → 50 | Product Hunt prep, Discord community, blog post | Calvin + Agents |
| W4 | 4/17 - 4/23 | 50 → 80 | Product Hunt launch, cross-promote | Agents (Calvin approves) |

## W1 Action Items (This Week)

### Calvin Manual Actions (do once)

1. **Upgrade to Closed Testing (Open)** on Google Play Console
   - Play Console → Testing → Closed testing → Create track
   - Or: Promote internal test build to closed testing
   - Set "testers" to "Anyone with the link"
   - Submit for review (1-3 days)
   - Result: get a shareable opt-in URL

2. **Post Reddit Option A** to r/musicsuggestions
   - Use draft from `paperclip/drafts/reddit-2026-03-25.md` Option A
   - Replace `[Google Play beta link]` with new closed testing URL
   - Reply to every comment within 24 hours

3. **Fix streak bug** — streak_count=0 for all real users
   - Root cause: openCard() bypasses backend (direct Supabase)
   - Previous fix was partial (user 87cd9416 now at streak=1, should be ~9+)

### Agent Automation (no Calvin action needed)

| Agent | Action | Frequency |
|-------|--------|-----------|
| Social | Daily posts with beta CTA link | Daily |
| Curator | Maintain pool >14 days | Daily |
| Quality | Monitor surprise rate, pool health | Daily |
| Analytics | Track real user metrics | Daily |
| CEO | Surface blockers, compile digest | Daily |

### Agent Config Updates Needed

- Social agent: add `beta_link` to context, mandate CTA in every post
- Outreach agent: unblock curator outreach (Calvin approves 5 drafts)

## W2 Action Items

1. **Reddit #2**: Post Option C to r/androidapps (1 day after W1 post settles)
2. **Curator outreach**: Send to Stereofox + Under the Radar first (alternative gap)
3. **Twitter thread**: Build-in-public thread about taste distance algorithm
4. **Discord**: Invite Reddit respondents to Discord for community

## W3 Action Items

1. **Product Hunt prep**: Ship page, screenshots, maker story
2. **Blog post**: "How we measure taste distance" — technical + accessible
3. **Discord events**: Weekly "Surprise Song" discussion

## W4 Action Items

1. **Product Hunt launch**: Coordinate with social + Bluesky + Twitter
2. **Cross-promote**: Ask early users to share on their socials
3. **Evaluate**: Which channels converted best? Double down.

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Weekly new users | +10-15/week | Supabase `is_seed=false` count |
| Day-1 retention | >40% | User opens card day after signup |
| Day-7 retention | >20% | User opens card 7 days after signup |
| Surprise rate | >25% | Feedback = 'surprised' / total feedback |
| Recommend-back rate | >15% | Users who submit a recommendation |

## Channel ROI Tracking

| Channel | Expected | Cost | Notes |
|---------|----------|------|-------|
| Reddit r/musicsuggestions | 10-20 signups | Free | Highest intent audience |
| Reddit r/androidapps | 5-10 signups | Free | Dev audience, lower intent |
| Twitter/Bluesky organic | 2-5/week | Free | Slow build, compounds |
| Product Hunt | 30-50 day-1 | Free | Spike, needs timing |
| Curator outreach | 0-3 curators | Free | Pool quality, not user count |
| Discord | Retention, not acquisition | Free | Community flywheel |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Open Testing review rejected | Blocks distribution | Ensure listing compliance, screenshots ready |
| Reddit post removed (self-promotion) | Lose primary channel | Genuine tone, engage in comments, don't cross-post same day |
| Pool runs out before users arrive | Bad first experience | Curator agent bulk fill before push |
| Streak bug kills retention | Users churn day 2 | Fix before Reddit push |
| Too few users for matching | Everyone gets curator cards only | Acceptable for first 50 users, transparent about it |
