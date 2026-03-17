# CLAUDE.md — Taste Roulette MVP 開發指南

## 專案概述

Taste Roulette 是一款「反演算法」每日推薦 APP，刻意將用戶推出品味舒適圈。核心體驗：每天收到一張來自陌生人的推薦卡片（音樂），推薦內容與你的品味有一定距離但不至於排斥，追求「驚喜感」而非「精準度」。

**MVP 範圍**：僅限音樂推薦（單一垂直領域），Side project / 學習導向。

**專案定位**：以學習全端開發和驗證產品想法為主，不追求營收或快速增長。

## 技術選型

| 層級 | 技術 | 原因 |
|------|------|------|
| Mobile | React Native (Expo) | 單一 codebase，iOS + Android |
| Backend API | Node.js + Express/Fastify | 與前端共用語言，生態豐富 |
| Database | Supabase (PostgreSQL + Auth + Realtime) | 開箱即用 Auth、Row Level Security、Realtime subscriptions |
| 推薦引擎 | Python microservice (FastAPI) | scipy/sklearn 計算品味距離，獨立部署 |
| 外部 API | Spotify Web API, MusicBrainz | 作品 metadata、預覽播放、封面圖 |
| 推送通知 | Expo Push Notifications | 免設 FCM/APNs，Expo 內建 |
| 部署 | Vercel (API) + Railway (Python) + Supabase Cloud | 零 DevOps，按用量計費 |
| 監控 | Sentry + PostHog | 錯誤追蹤 + 產品分析 |

## 專案結構

```
taste-roulette/
├── CLAUDE.md                  # ← 你正在讀的檔案
├── README.md                  # 專案說明
├── docs/
│   ├── development-plan.md    # 14 週分階段開發計畫
│   ├── architecture.md        # 系統架構圖與資料流
│   ├── paperclip-ops.md       # Paperclip 經營階段轉移計畫
│   └── competitive-landscape.md
├── apps/
│   ├── mobile/                # React Native (Expo) APP
│   │   ├── app/               # Expo Router 頁面
│   │   ├── components/        # 共用元件
│   │   ├── hooks/             # 自訂 hooks
│   │   ├── services/          # API 呼叫層
│   │   ├── store/             # Zustand 狀態管理
│   │   └── utils/
│   ├── api/                   # Node.js Backend
│   │   ├── src/
│   │   │   ├── routes/        # API 路由
│   │   │   ├── services/      # 商業邏輯
│   │   │   ├── models/        # 資料模型
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   └── package.json
│   └── recommender/           # Python 推薦引擎
│       ├── app/
│       │   ├── main.py        # FastAPI 入口
│       │   ├── taste_engine.py # 品味距離演算法
│       │   └── models.py
│       └── requirements.txt
├── packages/
│   └── shared/                # 共用型別定義
│       └── types/
└── supabase/
    ├── migrations/            # DB schema migrations
    └── seed.sql               # 種子資料
```

## 資料模型 (Supabase/PostgreSQL)

### 核心表格

```sql
-- 用戶
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  taste_vector FLOAT8[] DEFAULT '{}',  -- 品味向量 (由推薦引擎更新)
  onboarding_completed BOOLEAN DEFAULT FALSE,
  streak_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding 回答 (swipe 問卷)
CREATE TABLE onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  track_id TEXT NOT NULL,          -- Spotify track ID
  reaction TEXT CHECK (reaction IN ('love', 'okay', 'not_for_me')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 推薦卡片
CREATE TABLE roulette_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES users(id),
  recommender_id UUID REFERENCES users(id),
  track_id TEXT NOT NULL,
  reason TEXT,                     -- 推薦者的一句話理由
  taste_distance FLOAT8,           -- 兩人品味距離
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'opened', 'feedback_given')),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 回饋
CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES roulette_cards(id),
  user_id UUID REFERENCES users(id),
  reaction TEXT CHECK (reaction IN ('surprised', 'okay', 'not_for_me')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 用戶推薦 (回推)
CREATE TABLE user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  track_id TEXT NOT NULL,
  reason TEXT,
  used BOOLEAN DEFAULT FALSE,      -- 是否已被配對系統使用
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 音樂 metadata 快取
CREATE TABLE tracks (
  spotify_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,
  preview_url TEXT,
  genres TEXT[],
  audio_features JSONB,            -- Spotify audio features
  mood_tags TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## API 端點設計

### Auth (Supabase 內建)
- `POST /auth/signup` — 註冊
- `POST /auth/signin` — 登入 (email/Apple/Google)

### Onboarding
- `GET /api/onboarding/tracks` — 取得 swipe 問卷曲目 (15-20 首)
- `POST /api/onboarding/responses` — 提交回答
- `POST /api/onboarding/complete` — 完成 onboarding，觸發品味向量計算 + 立即從 Curator pool 派發第一張卡片

### Daily Roulette
- `GET /api/roulette/today` — 取得今日推薦卡片
- `POST /api/roulette/:cardId/open` — 標記已開啟
- `POST /api/roulette/:cardId/feedback` — 提交回饋

### Recommend Back
- `GET /api/recommend/prompt` — 取得「輪到你了」提示
- `POST /api/recommend/submit` — 提交一個推薦
- `GET /api/recommend/search?q=` — 搜尋 Spotify 曲目

### Profile
- `GET /api/profile/me` — 個人資料與統計
- `GET /api/profile/taste-journey` — 品味演變軌跡 (Phase 2)

### Internal (推薦引擎)
- `POST /engine/compute-vector` — 計算/更新用戶品味向量
- `POST /engine/match` — 配對推薦者與接收者
- `GET /engine/health` — 健康檢查

## 品味距離演算法 (v1 — Genre-Based)

> **Note**: Spotify Audio Features API 已不可用 (403)。
> v1 改用 genre one-hot encoding + artist popularity 建立品味向量。

```python
# taste_engine.py 核心邏輯

import numpy as np
from scipy.spatial.distance import cosine

# 預定義 genre 列表 (約 20 個主要類型)
GENRES = ['pop', 'rock', 'hip-hop', 'r&b', 'jazz', 'classical', 'electronic',
          'latin', 'country', 'folk', 'metal', 'punk', 'indie', 'soul',
          'blues', 'reggae', 'world', 'ambient', 'k-pop', 'j-pop']

def compute_taste_vector(user_responses, track_genres):
    """
    基於 onboarding 回答 + track genres 建立品味向量
    維度：genre one-hot (20 dims) — 每個 genre 的偏好加權分數
    """
    weights = {'love': 1.0, 'okay': 0.3, 'not_for_me': -0.5}
    # 加權計算每個 genre 的偏好分數
    # ... 計算加權向量

def taste_distance(user_a_vector, user_b_vector):
    """Cosine distance between two taste vectors"""
    return cosine(user_a_vector, user_b_vector)

def find_sweet_spot_match(target_user, candidates, min_dist=0.3, max_dist=0.7):
    """
    找到品味距離在「驚喜甜蜜點」範圍內的配對
    太近 (<0.3): 沒有新鮮感
    太遠 (>0.7): 可能排斥
    甜蜜點: 0.3-0.7 (動態調整)
    """
    matches = []
    for candidate in candidates:
        dist = taste_distance(target_user.taste_vector, candidate.taste_vector)
        if min_dist <= dist <= max_dist:
            matches.append((candidate, dist))

    # 優先選擇距離接近 0.5 的（中間值 = 最大驚喜潛力）
    matches.sort(key=lambda x: abs(x[1] - 0.5))
    return matches
```

## 開發階段與 Claude Code 任務

### Phase 0: Foundation (Week 1-3)

**Task 0.1** — 初始化專案
```
建立 Expo 專案 (expo init)、Node.js API、Python recommender 的基礎結構。
設定 Supabase 專案、建立 DB schema migrations。
設定 ESLint、Prettier、TypeScript。
```

**Task 0.2** — Auth 與 Onboarding
```
串接 Supabase Auth (Email + Apple + Google Sign-in)。
建立 Onboarding swipe 介面：
- 全螢幕曲目卡片，左滑 not_for_me / 右滑 love / 上滑 okay
- 底部進度條 (15-20 題)
- 完成後呼叫 /api/onboarding/complete
```

**Task 0.3** — Content Metadata Pipeline
```
建立 Spotify API 串接 service：
- 搜尋曲目、取得 audio features
- 批次匯入種子曲目（為 onboarding 準備 100+ 首涵蓋多元類型的曲目）
- 快取到 tracks 表
```

**Task 0.4** — Push Notification 基礎建設
```
設定 Expo Push Notifications。
建立 daily cron job (每日早上 8:00 UTC+8 推送)。
```

### Phase 1: Core Loop (Week 4-7)

**Task 1.1** — Daily Roulette Card UI
```
設計並實作每日推薦卡片：
- 全螢幕卡片：封面圖 + 曲名 + 藝人 + 一句話理由
- 來源顯示為品味標籤（如「爵士迷」「電子控」）不顯示真名
- Spotify 30 秒預覽播放
- 動畫：翻牌效果進場
```

**Task 1.2** — Feedback 機制
```
三段式回饋 UI：
- 🤯 驚喜 / 😐 普通 / 🙅 不適合
- 可選短評（限 100 字）
- 提交後顯示品味距離視覺化（如「這位推薦者跟你的品味距離 63%」）
```

**Task 1.3** — Recommend-Back Flow (Optional + Incentive)
```
回饋後顯示「輪到你推薦了」（可選，非強制）：
- Spotify 搜尋介面（搜尋 + 選曲）
- 輸入一句話理由（必填，引導文案：「用一句話告訴對方為什麼要聯這首」）
- 提交後存入 user_recommendations 池
- 激勵機制：回推者獲得額外卡片、徽章、品味探索統計加成
- 用戶可跳過，不會被暫停接收
```

**Task 1.4** — 配對引擎 v1
```
Python microservice：
- 每日定時任務：為所有活躍用戶配對
- 從 user_recommendations 池中選取，根據品味距離甜蜜點配對
- 產生 roulette_cards 記錄
- Fallback：如果池中推薦不足，使用 Curator 策展內容
```

### Phase 2: Stickiness (Week 8-10)

**Task 2.1** — Taste Journey Map
```
視覺化個人品味演變：
- 雷達圖：品味維度隨時間變化
- 時間軸：標記每次「驚喜」反應的推薦
- 統計：已探索 N 個新類型、最遠品味距離
```

**Task 2.2** — Streak & Badges
```
遊戲化輕量元素：
- 連續天數（火焰圖示）
- 徽章：「跨了 5 個類型」「連續 7 天」「第一個驚喜」
- Profile 頁展示
```

**Task 2.3** — Spotify 匯入
```
OAuth 串接 Spotify：
- 讀取用戶 Top Tracks / Top Artists
- 匯入 Recently Played
- 用這些數據豐富品味向量
```

### Phase 3: Growth (Week 11-14)

**Task 3.1** — Share Card 社群分享
```
生成分享圖卡：
- 精美圖片（封面 + 曲名 + 「有人推薦了一首跟我品味距離 X% 的歌」）
- 一鍵分享到 IG Stories / Twitter
- Deep link 回 APP
```

**Task 3.2** — Taste Twin Matching
```
品味雙胞胎 / 互補配對：
- 顯示跟你品味「最像」和「最互補」的 3 位用戶
- 匿名對話（限制每日訊息數）
```

**Task 3.3** — Curator Program
```
後台管理介面：
- Curator 邀請碼系統
- Curator 每日提交推薦的介面
- Curator 推薦的優先配對權重
```

**Task 3.4** — Premium Tier (低優先，視學習興趣決定)
```
付費功能（RevenueCat 串接）— Side project 定位下非必要：
- 每日 3 張卡片（免費版 1 張）
- 指定領域偏好
- 查看誰推薦了你
- $4.99/月
```

## 程式碼風格與約定

- **語言**：TypeScript (前後端)，Python (推薦引擎)
- **命名**：camelCase (TS)，snake_case (Python)
- **元件**：函式元件 + hooks，不用 class component
- **狀態管理**：Zustand（輕量、簡單）
- **API 呼叫**：React Query (TanStack Query)
- **測試**：Jest (API)，pytest (Python)，暫不需要 E2E
- **Git**：Conventional Commits (feat:, fix:, chore:)
- **分支**：main → dev → feature/xxx

## 環境變數

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Expo
EXPO_PROJECT_ID=

# Recommender
RECOMMENDER_URL=http://localhost:8000

# PostHog
POSTHOG_API_KEY=

# RevenueCat (Phase 3)
REVENUECAT_API_KEY=
```

## 關鍵設計原則

1. **Less is more** — 每日只推一張卡片，不做無限 feed
2. **鼓勵而非強制** — 回推是可選的，透過激勵（額外卡片、徽章）鼓勵參與
3. **匿名但有人味** — 用品味標籤代替真名
4. **驚喜 > 精準** — 演算法目標是最大化驚喜感，不是匹配度
5. **Mobile-first** — 所有功能優先在手機上體驗
6. **Instant value** — Onboarding 完成後立即派發第一張卡片，不讓用戶空手離開

## 備註

- MVP 階段不需要 Web 版
- 音訊播放採 Spotify Embed 方案：用 WebView 嵌入 `https://open.spotify.com/embed/track/{id}`，不需 API 認證，用戶可在 app 內直接聽歌。若 Embed 不可用則 fallback 至 "Open in Spotify" deep link
- Spotify Audio Features API 已不可用 (403)，品味向量改用 genre + artist 資訊 + onboarding 反應建立
- Apple/Google Sign-In 延後至 post-MVP，目前使用 Email + Spotify OAuth
- Python recommender service 為備用架構，目前配對邏輯完全在 TypeScript API 中執行
- 推薦回推激勵：提交推薦後自動獲得一張 Bonus 卡片（curator fallback）
- 所有用戶間互動匿名，不暴露個人資訊
- GDPR compliant from Day 1（Supabase 支援歐洲 region）
