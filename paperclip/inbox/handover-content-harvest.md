# Handover: Content Harvest Pipeline（外部 Curator 內容爬取）

> 來源 session: Paperclip 營運 session (2026-03-26)
> 交接對象: 開發 session
> 優先級: High（解決 alternative 0 首 + pool 多樣性 P0）

## 背景

Outreach agent 原本的任務是主動招募音樂部落客成為 curator。Calvin 提出新方向：**直接爬取這些平台的公開推薦內容**，省去等待回覆的時間。推薦本身是匿名呈現，不需要對方「加入」平台。

## 目標

建立一個 pipeline：爬取音樂媒體網站 → 提取歌曲推薦+理由 → 匹配 Spotify → 入庫為 curator 推薦。

## 資料流

```
外部網站（公開文章）
    ↓ crawl + parse
結構化資料: { track, artist, reason, source, author, date }
    ↓ Spotify Search API (Client Credentials flow, 無用戶限制)
Spotify metadata: track_id, genres, cover_url
    ↓ insert
DB: profiles (curator profile) + tracks (metadata) + user_recommendations (推薦)
    ↓ 配對引擎自動取用
用戶收到卡片，看到: 歌名 + 改寫後的理由 + 匿名品味標籤
```

## 目標來源（依優先順序）

| # | Source | URL | 重點類型 | 爬取難度 | 備註 |
|---|--------|-----|---------|---------|------|
| 1 | **Earmilk** | earmilk.com | electronic/hip-hop/alt | 低 | 文章含 Spotify embed，可直接提取 track_id |
| 2 | **Stereofox** | stereofox.com | indie/alt/electronic | 低 | 結構化文章，明確歌名+藝人 |
| 3 | **Metal Sucks** | metalsucks.net | metal | 中 | 填補最大失衡 (pop:metal = 8:1) |
| 4 | **Under the Radar** | undertheradarmag.com | indie/alt | 中 | alternative 0 首的關鍵來源 |
| 5 | **World Music Central** | worldmusiccentral.org | world | 中 | 較長文，需摘要理由 |

## DB 結構（已存在，無需 migration）

### 建立外部 curator profile

```sql
INSERT INTO profiles (id, display_name, is_curator, curator_weight, is_seed, onboarding_completed, taste_vector)
VALUES (
  gen_random_uuid(),
  'Earmilk Editors',      -- 內部識別用，用戶看不到
  TRUE,
  1.5,                     -- curator 優先權重
  TRUE,                    -- 標記為系統種子
  TRUE,
  '{}'                     -- 爬完後根據推薦的 genre 分布計算
);
```

每個來源建一個 profile。用戶端只看到 `recommender_taste_label`（如「Alternative 探索者」），不會看到 display_name。

### 插入推薦

```sql
INSERT INTO user_recommendations (user_id, track_id, reason, is_curator_pick, used)
VALUES (
  '<curator_profile_id>',
  '<spotify_track_id>',
  '一位 alternative 音樂編輯認為這首歌的合成器編曲值得被更多人聽到',  -- 改寫後的理由
  TRUE,
  FALSE
);
```

### 確保 tracks 表有 metadata

```sql
INSERT INTO tracks (spotify_id, title, artist, album, cover_url, genres, mood_tags)
VALUES ('<id>', '<title>', '<artist>', '<album>', '<cover>', '{indie,alternative}', '{}')
ON CONFLICT (spotify_id) DO NOTHING;
```

## 實作要點

### 1. 爬取（per source）

- 每個來源需要獨立的 parser（HTML 結構不同）
- 優先找含 Spotify embed/link 的文章（直接拿 track_id）
- 沒有 Spotify link 的：用 `track name + artist` 呼叫 Spotify Search API 匹配
- 存儲原始來源 URL 供內部追蹤（不對外暴露）

### 2. 理由處理

- **不直接複製原文**（版權考量）
- 改寫為 1 句話，格式：`一位{taste_label}認為{改寫後的推薦理由}`
- 或用更自然的格式：`{改寫的理由} — {taste_label}`
- 可以用 LLM 批次改寫（輸入原文段落 → 輸出 1 句摘要理由）

### 3. Curator 側寫（taste_vector 計算）

爬完所有推薦後，根據推薦歌曲的 genre 分布計算該 curator 的 taste_vector（21 維）：

```typescript
// 與 onboarding 相同的邏輯
// 每首推薦的 genre 加權 1.0（等同 "love" 反應）
// normalize 後存入 profiles.taste_vector
```

這讓配對引擎能計算 curator 與用戶的 taste_distance，確保推薦落在甜蜜點 (0.3-0.7)。

### 4. 建議的程式結構

```
apps/api/src/scripts/
  content-harvest/
    index.ts          # 主入口: CLI 介面，選擇來源
    sources/
      earmilk.ts      # Earmilk parser
      stereofox.ts    # Stereofox parser
      metalsucks.ts   # Metal Sucks parser
    utils/
      spotify-match.ts  # track name → Spotify ID
      reason-rewrite.ts # 原文 → 1 句改寫
      curator-profile.ts # 建立/更新 curator profile + taste_vector
```

執行方式：
```bash
cd apps/api && npx tsx src/scripts/content-harvest/index.ts --source earmilk --limit 50
```

### 5. 排程整合（完成後）

建立 Paperclip skill `paperclip/skills/content-harvest/SKILL.md`，讓 Curator agent 在每週三深度分析 heartbeat 中自動執行。

## 法律/倫理注意事項

- 只爬取公開頁面（無需登入）
- 理由改寫不直接引用原文（避免版權問題）
- 內部記錄來源但不對用戶暴露
- 不聲稱這些人「加入了平台」
- 如任何來源的 robots.txt 禁止爬取，跳過該來源

## 驗收標準

- [ ] 至少完成 Earmilk + Stereofox 兩個來源的 parser
- [ ] 每個來源產出 30+ 首有效推薦（含 Spotify metadata + 改寫理由）
- [ ] 建立對應的 curator profile，taste_vector 已計算
- [ ] 推薦出現在配對引擎的候選池中（`is_curator_pick = TRUE, used = FALSE`）
- [ ] 手動觸發配對後，確認新推薦能被派發給用戶

## 相關檔案

- 配對引擎: `apps/api/src/services/matching.ts`
- 種子 curator 範例: `apps/api/src/scripts/seed-users.ts`
- Curator 路由: `apps/api/src/routes/curator.ts`
- 品味向量計算: `apps/api/src/services/taste.ts`
- Curator 理由: `apps/api/src/utils/curator-reasons.ts`
- Outreach 候選人草稿: `paperclip/drafts/curator-outreach-2026-03-26.md`
