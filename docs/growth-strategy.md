# Taste Roulette — Growth Strategy

> Target: 1,000 users in 3 months | Market: US/EU (English-speaking) | Budget: $50-100/month

## Key Decisions

### Platform: Android-first
- **Month 1-2**: Android only (APK direct + Google Play)
- **Month 3+**: Submit iOS after product stabilizes
- Rationale: Faster iteration (no Apple review wait), lower cost ($25 one-time vs $99/year), APK direct distribution for beta

### Auth: Email-only (no Spotify login)
- Spotify Dev Mode has 25-user limit
- Extension Request deferred until post-1000-users
- Spotify Embed (WebView) still works for in-app playback without auth

### Domain & Email Strategy
- **Now (Month 1)**: Use `taste-roulette.vercel.app` — zero cost, no blocker
- **Month 2 (launch week)**: Buy `tasteroulette.app` (~$14-20/year)
  - Set up Cloudflare DNS + Vercel custom domain (5 min)
  - Cloudflare Email Routing (free): `hello@tasteroulette.app` → personal Gmail
  - Supabase Auth custom sender domain (free, needs DNS records)
- **No Google Workspace needed** — Cloudflare free forwarding + Gmail alias for sending
- Total domain cost: ~$1.5/month

| Scenario | Now | After domain purchase |
|----------|-----|-----------------------|
| API endpoint | `taste-roulette.vercel.app` | `api.tasteroulette.app` |
| Landing page | same | `tasteroulette.app` |
| Product Hunt listing | vercel.app (fine for beta) | `tasteroulette.app` |
| Support email | personal Gmail | `hello@tasteroulette.app` (forwarded) |
| Curator outreach | personal Gmail | `hello@tasteroulette.app` (Gmail alias) |
| Supabase auth emails | default sender | `noreply@tasteroulette.app` |

---

## Phase 1: Month 1 — Pre-launch + Closed Beta (Target: 50 users)

### P0 Technical Work (blocks launch)
1. **Landing page** — one-page static site + Privacy Policy
   - New `apps/landing/`, deploy to Vercel
   - English primary, optional Traditional Chinese
2. ~~Account deletion API~~ — deferred (iOS requirement, not needed for Android)
3. ~~Universal Links~~ — deferred (Android App Links simpler, do when needed)

### P1 Technical Work (strongly recommended)
4. **Referral code system** — main growth engine
   - New migration: `invite_codes` table
   - New route: `apps/api/src/routes/invite.ts` (generate + redeem)
   - Reward: referrer gets 3 bonus cards, invitee gets 2 cards on day 1
   - `ShareCard.tsx` footer adds referral link
5. **PostHog event completion** — ensure funnel is trackable
   - Key events: onboarding_completed, card_opened, feedback_given, share_card, invite_sent
6. **Sentry source maps** — `enableAutoUploadSourceMaps: true` in app.json

### Closed Beta (Week 2-4)
- EAS Build: `eas build --platform android --profile preview` → distribute APK
- Recruit 30-50 testers:
  - Personal network (10-15)
  - Reddit: r/musicsuggestions, r/ifyoulikeblank, r/indieheads (10-15)
  - Discord music communities (10-15)
  - Indie Hackers community (5-10)
- Observe: onboarding completion rate, D1 retention, surprise feedback ratio
- Week 3-4: Submit to Google Play

### Agent Config (Month 1)
| Agent | Task |
|-------|------|
| CEO | Track Beta metrics, Monday weekly Beta summary |
| Curator | Pool >= 500 tracks, Western indie/alt/electronic >= 40%, Asian <= 20% |
| Analytics | Track Beta funnel and D1/D3/D7 retention |
| Social | Prepare launch assets (English, 3-5 graphics + copy) |
| Outreach | Research 30+ Western music bloggers / playlist curators / Discord mods |

---

## Phase 2: Month 2 — Public Launch + Organic Growth (Target: cumulative 200 users)

### Pre-launch (1 week before)
- Buy `tasteroulette.app` domain
- Set up: Cloudflare DNS → Vercel custom domain
- Set up: Cloudflare Email Routing (`hello@tasteroulette.app` → Gmail)
- Set up: Supabase custom email sender domain
- Update landing page with custom domain

### Launch Week
- Google Play public release
- Landing page with Play Store badge
- **Product Hunt launch** (primary Western discovery channel)
- **Indie Hackers post** (side project story + tech stack)
- **Hacker News Show HN** (if Product Hunt goes well)
- Reddit posts: r/musicsuggestions, r/indieheads, r/androidapps
- Twitter/X English announcement

### Content Marketing
- Twitter/X `@tasteroulette` — 1 tweet daily (English): surprise stats / genre education / taste stories / dev log
- IG `@tasteroulette.app` — 3 visual posts per week
- Medium / dev.to — 2-3 English articles:
  - "Why I built an anti-algorithm music app"
  - "React Native + Supabase + Vercel: full-stack side project"
  - "Measuring taste distance: quantifying music preference"

### Budget
| Channel | Monthly | Est. new users |
|---------|---------|----------------|
| Organic (Product Hunt + Reddit + Indie Hackers + dev.to) | $0 | 80-150 |
| Reddit Ads / Twitter Ads (from week 6 if needed) | $50 | 50-100 |

---

## Phase 3: Month 3 — Acceleration (Target: cumulative 1,000 users)

### Referral Full Launch
- Prominent invite button on home + profile screens
- Share Card embeds referral link + QR code

### Curator Program
- Select 5-10 curators from Outreach agent's compiled list
- Use existing `apps/api/src/routes/curator.ts` invite code system
- Target: each curator brings 20-50 users

### Expanded Exposure
- Pitch 3-5 English indie music / tech podcasts (angle: "anti-algorithm")
- Spotify playlist curator collaborations (track with invite codes)
- TikTok / IG Reels: "algorithm vs anti-algorithm" comparison content
- Subreddit AMAs (r/indieheads, r/musicsuggestions)

### iOS Submission (if product stable)
- Account deletion API (Apple requirement)
- Universal Links setup
- App Store screenshots + description
- Submit via EAS Build + App Store Connect

### Budget
| Channel | Monthly | Est. new users |
|---------|---------|----------------|
| Referral | $0 | 200-400 |
| Curator program | $0 | 100-250 |
| Ads (Reddit/Twitter) | $50-100 | 100-200 |
| Podcast / Reddit AMA | $0 | 50-100 |

---

## KPI Targets

| Metric | M1 (Beta) | M2 (Launch) | M3 (Growth) |
|--------|-----------|-------------|-------------|
| Cumulative users | 50 | 200 | 1,000 |
| DAU | 20 | 60 | 250 |
| D7 retention | 35% | 30% | 30% |
| Card open rate | 70% | 60% | 60% |
| Surprise feedback rate | 20% | 25% | 25% |
| Recommendation pool | 500+ | 800+ | 1,200+ |

---

## Cost Summary

| Item | Monthly | Annual | Phase |
|------|---------|--------|-------|
| Domain (`tasteroulette.app`) | ~$1.5 | ~$18 | Month 2+ |
| Cloudflare Email Routing | $0 | $0 | Month 2+ |
| Google Play developer | — | $25 (one-time) | Month 1 |
| Apple Developer | — | $99 (deferred) | Month 3+ |
| Growth ads budget | $50-100 | — | Month 2-3 |
| Paperclip agents | $120 | — | Ongoing |
| **Total Month 1** | **$120** | | |
| **Total Month 2-3** | **$170-220** | | |
