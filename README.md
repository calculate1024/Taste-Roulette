# Taste Roulette

> Anti-algorithm daily music recommendation app — pushing you out of your taste comfort zone.

Every day you receive one music recommendation from a stranger whose taste is *different enough* to surprise you, but *not so far* that you'd hate it. The sweet spot of discovery.

## Core Concept

- **One card per day** — no infinite feed, no doom scrolling
- **Anonymous recommendations** — users are identified by taste labels (e.g., "Jazz Lover", "Electronic Enthusiast"), not real names
- **Surprise > Accuracy** — the algorithm maximizes serendipity, not match precision
- **Optional give-back** — after receiving, you can recommend a track back to the pool (incentivized, not forced)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) + Expo Router |
| Backend API | Node.js + Express + TypeScript |
| Recommendation Engine | Python + FastAPI + NumPy/SciPy |
| Database & Auth | Supabase (PostgreSQL + Auth + RLS) |
| Music Data | Spotify Web API |
| Audio Playback | Spotify Embed (WebView) |
| Push Notifications | Expo Push Notifications |
| State Management | Zustand + AsyncStorage |

## Project Structure

```
taste-roulette/
├── apps/
│   ├── mobile/              # React Native (Expo) app
│   │   ├── app/             # Expo Router pages
│   │   ├── components/      # Shared components
│   │   ├── services/        # API & Supabase clients
│   │   ├── store/           # Zustand state
│   │   └── hooks/           # Custom hooks
│   ├── api/                 # Express API server
│   │   └── src/
│   │       ├── routes/      # API endpoints
│   │       ├── services/    # Business logic
│   │       ├── middleware/  # Auth middleware
│   │       └── utils/       # Shared utilities
│   └── recommender/         # Python taste engine
│       └── app/
│           ├── main.py      # FastAPI endpoints
│           ├── taste_engine.py
│           └── models.py
├── packages/
│   └── shared/              # Shared TypeScript types
├── supabase/
│   └── migrations/          # Database schema
└── .claude/
    └── launch.json          # Dev server configs
```

## Features

### Phase 0: Foundation
- Email authentication (Supabase Auth)
- Onboarding swipe questionnaire (8-10 tracks, early exit on clear patterns)
- Genre-based taste vector computation (20 dimensions)
- Push notification infrastructure

### Phase 1: Core Loop
- Daily roulette card with flip animation
- Spotify Embed audio player (WebView)
- Three-tier feedback (Surprised / OK / Not for me)
- Recommend-back flow with Spotify search
- Daily matching engine with taste distance sweet spot (cosine distance 0.3-0.7)
- Curator fallback for cold start

### Phase 2: Stickiness
- Taste Journey radar chart (6-axis genre visualization)
- Streak tracking + 6 badge types
- Spotify OAuth import (top tracks/artists → enriched taste vector)

### Phase 3: Growth
- Share Card generation (ViewShot → social media sharing)
- Taste Twin matching (most similar + most complementary users)
- Curator Program (invite codes, prioritized recommendations)

## Taste Distance Algorithm

Uses cosine distance on 20-dimensional genre vectors:

```
Genres: pop, rock, hip-hop, r&b, jazz, classical, electronic,
        latin, country, folk, metal, punk, indie, soul,
        blues, reggae, world, ambient, k-pop, j-pop

Weights: love = 1.0, okay = 0.3, not_for_me = -0.5

Sweet Spot: distance 0.3-0.7 (prefer ~0.5 for maximum surprise)
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

   Create `.env` in project root:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
   CRON_API_KEY=your_random_api_key
   ```

   Create `apps/mobile/.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```

3. **Database setup**

   Run migrations in Supabase SQL Editor (in order):
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_push_token.sql
   supabase/migrations/003_spotify_auth.sql
   supabase/migrations/004_curator_program.sql
   ```

4. **Seed tracks**
   ```bash
   cd apps/api && npm run seed
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
| GET | `/api/onboarding/tracks` | JWT | Onboarding track list |
| POST | `/api/onboarding/responses` | JWT | Submit swipe responses |
| POST | `/api/onboarding/complete` | JWT | Complete onboarding |
| GET | `/api/roulette/today` | JWT | Today's card |
| POST | `/api/roulette/:cardId/open` | JWT | Mark card opened |
| POST | `/api/roulette/:cardId/feedback` | JWT | Submit feedback |
| GET | `/api/recommend/search` | JWT | Search Spotify tracks |
| POST | `/api/recommend/submit` | JWT | Submit recommendation |
| GET | `/api/profile/me` | JWT | User profile + stats |
| GET | `/api/profile/taste-journey` | JWT | Taste vector + journey data |
| GET | `/api/twins` | JWT | Taste twins + complements |
| POST | `/api/curator/redeem` | JWT | Redeem curator invite |
| POST | `/api/admin/match` | API Key | Trigger daily matching |
| POST | `/api/notifications/send-daily` | API Key | Send daily push |
| GET | `/api/share/:cardId` | Public | OG meta for shared cards |

## Known Limitations

- **Spotify Dev Mode**: OAuth limited to 25 whitelisted users (needs Extension Request for production)
- **Spotify Preview URLs**: No longer available (using Spotify Embed instead)
- **Spotify Audio Features API**: Returns 403 (using genre-based vectors instead)
- **Taste Twin scaling**: Currently loads all users into memory (needs pgvector for production)

## License

Private project — not open source.
