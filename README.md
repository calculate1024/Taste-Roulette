# Taste Roulette

> Anti-algorithm daily music recommendation app — pushing you out of your taste comfort zone.

Every day you receive one music recommendation from a stranger whose taste is *different enough* to surprise you, but *not so far* that you'd hate it. The sweet spot of discovery.

## Project Status

**Current Phase:** Closed Beta (Android — Google Play Alpha track, review pending)
**Beta Link:** [Join Beta on Google Play](https://play.google.com/apps/testing/com.tasteroulette.app)
**Target:** 80 users in 4 weeks (Western/English-speaking market)
**Platform:** Android-first (iOS deferred until product stabilizes)

| Week | Target | Status |
|------|--------|--------|
| W1 (3/27-4/2) | 15 users | **In progress** — Reddit posted (4 subs), Play Store review pending |
| W2 (4/3-4/9) | 30 users | Planned — Reddit wave 2 (r/musicsuggestions), Twitter/Bluesky content |
| W3 (4/10-4/16) | 50 users | Planned — Product Hunt prep |
| W4 (4/17-4/23) | 80 users | Planned — Product Hunt launch |

**Active Channels:** Twitter/X [@tasteroulette](https://x.com/tasteroulette) · [Bluesky](https://bsky.app/profile/musictasteroulette.bsky.social) · Reddit ([u/tasteroulette](https://reddit.com/u/tasteroulette))

## Core Concept

- **One card per day** — no infinite feed, no doom scrolling
- **Anonymous recommendations** — users are identified by taste labels (e.g., "Jazz Lover", "Electronic Enthusiast"), not real names
- **Surprise > Accuracy** — the algorithm maximizes serendipity, not match precision
- **Re-recommend your discoveries** — after receiving a card you love, pass it forward to another stranger (incentivized with bonus cards)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) + Expo Router |
| Backend API | Node.js + Express + TypeScript |
| Matching Engine | TypeScript (in API server) |
| Database & Auth | Supabase (PostgreSQL + Auth + RLS) |
| Music Data | Spotify Web API + Last.fm + MusicBrainz |
| Audio Playback | Spotify Embed (WebView) + deep link fallback |
| Push Notifications | Expo Push Notifications |
| State Management | Zustand + AsyncStorage |
| Deployment | Vercel (API) + EAS Build (Mobile) |
| Monitoring | Sentry (error tracking) + PostHog (analytics) |
| AI Ops | [Paperclip](https://github.com/paperclipai/paperclip) (9-agent orchestration) |

## Project Structure

```
taste-roulette/
├── apps/
│   ├── mobile/              # React Native (Expo) app
│   │   ├── app/             # Expo Router pages
│   │   ├── components/      # Shared components
│   │   ├── i18n/            # Internationalization (en, zh-TW)
│   │   ├── services/        # API & Supabase clients
│   │   ├── store/           # Zustand state
│   │   └── hooks/           # Custom hooks
│   ├── api/                 # Express API server
│   │   └── src/
│   │       ├── routes/      # API endpoints
│   │       ├── services/    # Business logic
│   │       ├── middleware/  # Auth middleware
│   │       └── utils/       # Shared utilities
│   └── recommender/         # Python taste engine (backup, not deployed)
│       └── app/
│           ├── main.py      # FastAPI endpoints
│           ├── taste_engine.py
│           └── models.py
├── packages/
│   └── shared/              # Shared TypeScript types
├── paperclip/               # AI agent orchestration (→ paperclip/README.md)
│   ├── README.md            # Full Paperclip documentation
│   ├── company.yaml         # Company config & KPI targets
│   ├── agents/              # 9 agent definitions (CEO → specialists)
│   ├── skills/              # Agent skill procedures & SQL queries
│   ├── logs/                # Agent execution logs + cost tracker
│   ├── inbox/               # Calvin → Agent instructions
│   └── drafts/              # Social content awaiting approval
├── supabase/
│   └── migrations/          # Database schema
└── .claude/
    └── launch.json          # Dev server configs
```

## Features

### Phase 0: Foundation
- Email authentication (Supabase Auth)
- **Redesigned onboarding** — 3-step flow: Genre Pick (3-5 genres) → Swipe (10 genre-filtered tracks) → Taste Profile Reveal ("Your Taste DNA")
- Genre-based taste vector computation (21 dimensions, incl. c-pop)
- Conservative first card (distance 0.20-0.45) to build trust before pushing boundaries
- Push notification infrastructure

### Phase 1: Core Loop
- Daily roulette card with flip animation
- "Open in Spotify" deep link button
- Three-tier feedback (Surprised / OK / Not for me)
- Recommend-back flow with Spotify search + bonus card incentive
- Daily matching engine with taste distance sweet spot (cosine distance 0.3-0.7)
- Curator fallback for cold start and bonus rewards

### Phase 2: Stickiness
- Taste Journey radar chart (6-axis genre visualization)
- Streak tracking + 6 badge types
- Spotify OAuth import (top tracks/artists → enriched taste vector)

### Phase 3: Growth
- Share Card generation (ViewShot → social media sharing)
- Taste Twin matching (most similar + most complementary users)
- Curator Program (invite codes, prioritized recommendations)

### Phase 3 Aha Moment — Progressive Reveal & Feedback Loop
- **Progressive card reveal** — 4-step state machine: identity → cover → player → feedback
- **Adventure level** — 5-tier visual indicator (Comfort → Extreme) based on taste distance
- **Micro-insight** — real-time taste vector update on feedback, radar chart before/after comparison
- **Reaction echo** — push notification to recommender when their track gets a "surprised" reaction
- **Impact stats** — profile page shows how many people your recommendations surprised

### Phase 3B Aha Moment — Enhancements
- **Yesterday's Echo** — animated toast on home screen when your recommendation was appreciated yesterday
- **First Discovery Badge** — genre category badge unlocks on first "surprised" reaction per category (6 categories)
- **Contextual Recommendation Prompt** — dynamic subtitle and placeholder based on just-heard track
- **Bookmark / Save for Later** — save cards after feedback for later listening (dedicated bookmarks API + UI)
- **Onboarding Reminder** — push notification 24h after signup if onboarding not completed
- **Pool Auto-Alert** — matching engine alerts CEO agent when pool drops below 50 tracks

### Recent Fixes (2026-03-27)
- **Streak calculation rewrite** — streak_count now recomputes from opened_at history (self-healing), fixing bug where all real users showed streak=0
- **Orphaned pool entries** — prevent orphaned records in user_recommendations when track lookup fails; detect and clean existing orphans
- **Push notifications fixed** — Supabase FK join query corrected + missing Android notification channels added
- **Profile page scrollable** — login/delete buttons now reachable on all screen sizes
- **Badge deduplication** — badges shown only on Journey tab (removed from Profile)
- **Bonus card visibility** — home screen auto-refreshes when returning from recommend flow
- **Error feedback** — users now see alerts on card load and bookmark failures (no more silent fails)
- **Performance indexes** — added DB indexes for recommender echo, feedback stats, and pending card queries

### Phase 4: Cold Start & Onboarding
- **Taste-aware curator fallback** — system recommendations now use cosine distance sweet spot instead of random picks
- **Warm curator reasons** — each seed track has a hand-written, human-sounding recommendation reason
- **Curator taste labels** — curator cards show genre-based labels (e.g., "爵士迷") instead of "Curator 策展人"
- **Seed users** — 8 virtual users with diverse taste vectors (Pop/Rock/Jazz/Electronic/Hip-Hop/Classical/World/Metal) and 5-8 pre-loaded recommendations each, enabling the matching engine to deliver real sweet-spot matches from day 1
- **Auto-expanded track pool** — `seed:expand` script searches Spotify by genre + known artists to auto-populate ~500 tracks across 21 genres, with Last.fm/MusicBrainz genre tagging
- **First card upgrade** — onboarding completion now delivers a taste-aware first card with distance + label
- **Spotify-first onboarding** — users connect Spotify before swipe, so onboarding uses their own listening history (~100% recognition rate)
- **Recognition fallback** — for non-Spotify users: quick "聽過嗎？" recognition phase filters tracks before swipe, ensuring 80%+ familiarity

### Phase 5: Intelligence & Diversity
- **C-Pop genre support** — 21st genre dimension for Chinese pop music
- **Genre correlation inference** — cold-start users get inferred preferences (e.g., liking jazz → partial affinity for soul/blues)
- **Last.fm genre tagging** — multi-source genre enrichment via Last.fm API
- **MusicBrainz fallback** — secondary genre source when Last.fm data is sparse
- **Spotify popularity deprecation** — adapted to Spotify API no longer returning popularity field

### Paperclip AI Operations

9 autonomous agents manage post-MVP operations via [Paperclip](https://github.com/paperclipai/paperclip). Executed by GitHub Actions on two schedules (morning batch + social batch) — runs even when your computer is off.

**→ Full documentation: [`paperclip/README.md`](paperclip/README.md)**

| Agent | Role | Schedule (UTC+8) |
|-------|------|-------------------|
| CEO | Strategic oversight | 07:00 |
| Curator | Pool management | 06:00 |
| Analytics | KPI snapshots | 09:00 |
| DevOps | Health monitoring | 08:00 |
| Social | Discord/Bluesky/Twitter | 18:00 |
| Quality | Content moderation | 10:00 |
| Bug Triage | Sentry triage | 11:00 |

## Internationalization (i18n)

- **Library**: expo-localization + i18next + react-i18next
- **Auto-detection**: device language detected via `expo-localization`
- **Supported locales**: English (en, default) + Traditional Chinese (zh-TW)
- **Translation files**: `apps/mobile/i18n/locales/en.json`, `apps/mobile/i18n/locales/zh-TW.json`
- **Coverage**: 100% key parity between en and zh-TW (259 keys)

## Taste Distance Algorithm

Uses cosine distance on 21-dimensional genre vectors:

```
Genres: pop, rock, hip-hop, r&b, jazz, classical, electronic,
        latin, country, folk, metal, punk, indie, soul,
        blues, reggae, world, ambient, k-pop, j-pop, c-pop

Weights: love = 1.0, okay = 0.3, not_for_me = -0.5

Sweet Spot: distance 0.3-0.7 (prefer ~0.5 for maximum surprise)

Adventure Levels:
  ≤0.2 🟢 Comfort    0.2-0.4 🔵 Small Adventure
  0.4-0.6 🟣 Unknown   0.6-0.8 🟠 Bold Exploration
  >0.8 🔴 Extreme Challenge

Feedback Learning Rate: 0.1
  surprised = +1.0, okay = +0.2, not_for_me = -0.3

Badge Categories (6):
  🎤 Pop/R&B  🎸 Rock/Metal  🎧 Hip-Hop/Soul
  🎹 Electronic  🎷 Jazz/Classical  🌍 World/Folk
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Expo CLI (`npm install -g expo-cli`)
- Supabase project ([supabase.com](https://supabase.com))
- Spotify Developer account ([developer.spotify.com](https://developer.spotify.com))

### Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/calculate1024/Taste-Roulette.git
   cd Taste-Roulette
   cd apps/api && npm install
   cd ../mobile && npm install
   cd ../recommender && pip install -r requirements.txt
   ```

2. **Environment variables**

   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase, Spotify, and monitoring credentials. See `.env.example` for all required variables.

3. **Database setup**

   Run migrations in Supabase SQL Editor (in order):
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_push_token.sql
   supabase/migrations/003_spotify_auth.sql
   supabase/migrations/004_curator_program.sql
   supabase/migrations/005_recommender_taste_label.sql
   supabase/migrations/006_cpop_dimension.sql
   supabase/migrations/007_referral_program.sql
   supabase/migrations/008_seed_flag.sql
   supabase/migrations/009_bookmarks_and_reminders.sql
   supabase/migrations/010_performance_indexes.sql
   ```

4. **Seed data**
   ```bash
   cd apps/api && npm run seed           # Seed 30 hand-picked tracks with Spotify metadata
   cd apps/api && npm run seed:expand    # Auto-expand to ~500 tracks via Spotify genre + artist search
   cd apps/api && npm run seed:users     # Seed 8 virtual users with 40+ recommendations
   cd apps/api && npm run seed:simulate  # Generate 100 AI seed users + 7-day behavioral simulation
   ```

5. **Start dev servers**
   ```bash
   # Terminal 1: API
   cd apps/api && npm run dev        # port 3000

   # Terminal 2: Mobile
   cd apps/mobile && npx expo start  # port 8081

   # Terminal 3: Recommender
   cd apps/recommender && uvicorn app.main:app --reload --port 8000
   ```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/onboarding/tracks` | JWT | Onboarding tracks (supports `?genres=` filter for genre-aware mode) |
| GET | `/api/onboarding/personal-tracks` | JWT | Personalized tracks from Spotify history |
| POST | `/api/onboarding/responses` | JWT | Submit swipe responses |
| POST | `/api/onboarding/complete` | JWT | Complete onboarding |
| GET | `/api/roulette/today` | JWT | Today's card |
| POST | `/api/roulette/:cardId/open` | JWT | Mark card opened |
| POST | `/api/roulette/:cardId/feedback` | JWT | Submit feedback |
| GET | `/api/recommend/search` | JWT | Hybrid search: local DB → Spotify fallback |
| GET | `/api/recommend/my-discoveries` | JWT | Tracks user received and reacted to (for re-recommend) |
| POST | `/api/recommend/submit` | JWT | Submit recommendation |
| DELETE | `/api/profile/me` | JWT | Delete account + all user data |
| POST | `/api/invite/generate` | JWT | Generate referral invite code |
| POST | `/api/invite/redeem` | JWT | Redeem invite code + track referral |
| GET | `/api/roulette/yesterday-echo` | JWT | Check if recommendation got surprised feedback yesterday |
| POST | `/api/roulette/:cardId/bookmark` | JWT | Save card for later |
| DELETE | `/api/roulette/:cardId/bookmark` | JWT | Remove bookmark |
| GET | `/api/roulette/bookmarks` | JWT | List saved cards (paginated) |
| GET | `/api/profile/me` | JWT | User profile + stats + badge data |
| GET | `/api/profile/taste-journey` | JWT | Taste vector + journey data |
| GET | `/api/twins` | JWT | Taste twins + complements |
| POST | `/api/curator/redeem` | JWT | Redeem curator invite |
| POST | `/api/admin/match` | API Key | Trigger daily matching |
| POST | `/api/notifications/send-daily` | API Key | Send daily push |
| GET | `/api/share/:cardId` | Public | OG meta for shared cards |

## Testing

```bash
cd apps/api && npm test              # 246 tests (14 suites, all passing)
```

| Test Suite | Coverage |
|-----------|----------|
| `vector.test.ts` | Cosine distance computation, edge cases |
| `genres.test.ts` | Genre constants, vector encoding, taste labels |
| `date.test.ts` | UTC+8 date handling, yesterday time range |
| `matching-edge.test.ts` | Sweet spot matching, weighted vector edge cases |
| `feedback-insight.test.ts` | Feedback delta math, dominant shift, badge category mapping |
| `adventure-level.test.ts` | 5-tier classification, boundary values, sweet spot alignment |
| `curator-reasons.test.ts` | Pre-written reasons lookup, genre-based fallback, taste labels |
| `curator-fallback.test.ts` | Taste-aware scoring, sweet spot selection, metadata generation |

## Deployment

| Service | URL | Notes |
|---------|-----|-------|
| API (Vercel) | `taste-roulette-*.vercel.app` | Auto-deploy from `main` branch |
| Mobile (EAS) | Expo Dev Build | `eas build --profile preview` for APK |
| Database | Supabase Cloud | PostgreSQL + Auth + RLS |
| Error Tracking | Sentry | Alerts on new issues via email |
| Analytics | PostHog | Product analytics (events, funnels) |

## Key Decisions & Constraints

### Spotify Dev Mode (Permanent)

As of May 2025, Spotify Extension Request requires: registered business, 250k+ MAU, company email, commercial viability. This side project will never qualify.

**Impact & Mitigations:**
| Feature | Affected? | Solution |
|---------|-----------|----------|
| Pool expansion (Curator agent) | No — Client Credentials (server-to-server) has no user limit | Curator runs daily |
| In-app playback | No — Spotify Embed (WebView) works without API auth | Already implemented |
| User-facing track search | Yes — 25 user limit on OAuth | Hybrid search: local DB first, Spotify fallback |
| Recommend-back | Yes — search would fail | Redesigned as "My Discoveries" (re-recommend received tracks) |
| Spotify OAuth login | Yes — 25 user limit | Email-only auth (Supabase) |

### Android-First Strategy

Frequent iteration expected during beta. Apple review takes 1-3 days per update; Android APK can be distributed instantly. iOS will be added when product stabilizes (target: Month 3).

### Market: US/EU English-Speaking

- All UI text: English primary, Traditional Chinese secondary
- Recommendation pool: Western indie/alt/electronic >= 40%, Asian music <= 20%
- Launch channels: Product Hunt, Indie Hackers, Reddit, Twitter/X (not Taiwan-centric)
- Brand voice: curious, warm, slightly playful (English)

### Budget

| Item | Monthly |
|------|---------|
| Growth (ads, tools) | $50-100 |
| Paperclip AI agents | $120 |
| Supabase | Free tier |
| Vercel | Free tier |
| Google Play | $25 one-time |
| Domain (Month 2) | ~$15/year |

## Known Technical Limitations

- **Spotify Audio Features API**: Returns 403 (using genre-based vectors instead)
- **Spotify Popularity API**: No longer returns popularity field (removed from all filtering logic)
- **Taste Twin scaling**: Currently loads all users into memory (needs pgvector for production)
- **Matching engine center**: Optimized at 0.4 (not 0.5) based on simulation — lower distance produces higher surprise rate

## Simulation & Validation

100 AI seed users with behavioral simulation (7 days):
- Feedback driven by taste distance (not random)
- Engagement decay modeled (D1: 85% → D7: 60%)
- Genre repeat penalty (consecutive same-genre cards reduce satisfaction)
- Cold start scenario tested (10 users + curator-only)
- Results documented in `docs/simulation-baseline.md`

**Key finding:** Matching center at 0.4 (instead of 0.5) produces optimal surprise rate of 28% while keeping not_for_me below 20%.

## License

Private project — not open source.
