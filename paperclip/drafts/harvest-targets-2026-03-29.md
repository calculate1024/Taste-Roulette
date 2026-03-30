# Content Harvest 擴充目標清單 — 2026-03-29
> 作者: Outreach Coordinator heartbeat
> 交接對象: 開發 session（實作 content-harvest pipeline）
> 背景: handover-content-harvest.md 已定義原始 5 個來源，本文件補充**緊急類型缺口**所需的額外來源

---

## 緊急背景（2026-03-29 CEO log）

| 類型 | 狀態 | 緊急程度 |
|------|------|---------|
| alternative | 0 首（Day 4） | 🚨 |
| reggae | -27（~5 天臨界） | 🚨 |
| k-pop | -10（~5 天臨界） | ⚠️ |
| world | -6（~5 天臨界） | ⚠️ |

---

## robots.txt 合規性確認

| 來源 | robots.txt 狀態 | AI/ClaudeBot 限制 | 結論 |
|------|----------------|-----------------|------|
| rootfire.net | 完全開放（Disallow: 空） | 無 | ✅ 可爬 |
| thebiaslist.com | 標準 WP 限制 | 無 | ✅ 可爬 |
| worldmusiccentral.org | 標準 WP 限制 | 無 | ✅ 可爬 |
| rootsandchordsmusic.com | Tilda 部分頁面封鎖 | 無 | ✅ 可爬 |
| reggae-vibes.com | 明確封鎖 ClaudeBot + GPTBot | **有** | ❌ 跳過 |

---

## 原始來源（handover-content-harvest.md）— 狀態確認

| # | Source | URL | 重點類型 | 優先級 |
|---|--------|-----|---------|--------|
| 1 | Earmilk | earmilk.com | electronic/hip-hop/alt | High — alternative 缺口 |
| 2 | Stereofox | stereofox.com | indie/alt/electronic | High — alternative 缺口 |
| 3 | Metal Sucks | metalsucks.net | metal | High — pop:metal 8x 失衡 |
| 4 | Under the Radar | undertheradarmag.com | indie/alt | High — alternative 缺口 |
| 5 | World Music Central | worldmusiccentral.org | world | Medium |

---

## 新增來源（緊急類型補充）

### Source 6: Rootfire — Reggae Release Radar

| 欄位 | 內容 |
|------|------|
| **URL** | https://rootfire.net/reggae-release-radar/ |
| **類型** | Reggae（含 roots, dancehall, rocksteady） |
| **更新頻率** | 每週（weekly new release roundup） |
| **爬取難度** | 低 — 列表格式，每次更新含多首新歌 |
| **robots.txt** | ✅ 完全開放 |
| **重點** | 獨立廠牌和主流廠牌均涵蓋；每週輸出量充足 |
| **解決問題** | reggae -27，5 天臨界 |

**建議 parser 策略：**
- 爬取最新 3-5 期 Release Radar 文章
- 每篇文章標題格式通常為 `Artist – Song Title`
- 搭配 Spotify Search API 匹配 track_id
- 理由改寫：`一位 reggae 樂迷認為這首 {根 / 舞廳 / reggae 融合} 作品值得被更多人發現`

---

### Source 7: The Bias List — K-Pop Reviews

| 欄位 | 內容 |
|------|------|
| **URL** | https://thebiaslist.com/ |
| **類型** | K-pop、J-pop |
| **更新頻率** | 每日（2-5 篇 review/day） |
| **爬取難度** | 低 — 一致的 WordPress 結構，標題格式 `Song Review: Artist – Track Name` |
| **robots.txt** | ✅ 標準 WP 限制，無 AI 封鎖 |
| **重點** | 使用 1-10 評分系統；有 archive 可按 rating 篩選高分作品 |
| **解決問題** | k-pop -10，5 天臨界 |

**建議 parser 策略：**
- 爬取 `Song Review:` 標題格式文章
- 解析 `Artist – Track Name` 格式
- 篩選 rating ≥ 8 的作品（保證品質）
- 理由改寫：`一位 k-pop 評論者認為這首歌的製作水準超出預期`
- 建議初始批次：100 篇 high-rated reviews → 目標 50+ 有效 Spotify 匹配

**確認的近期範例（2026-03 - 2026-03）：**
- BTS – Swim (2026-03-19)
- Yuna (ITZY) – Ice Cream (2026-03-23)
- Moonbyul (Mamamoo) – Hertz (2026-03-25)
- Xdinary Heroes – X room (2026-03-25)
- CSR – Can't Hide Anymore (2026-03-27)

---

### Source 8: Roots and Chords — Monthly World Music Picks

| 欄位 | 內容 |
|------|------|
| **URL** | https://rootsandchordsmusic.com/bestworldmusic2025 |
| **類型** | World music（Latin, African, Asian fusion, Celtic, Middle Eastern） |
| **更新頻率** | 月更（monthly Spotify playlist + annual best-of） |
| **爬取難度** | 中 — Tilda 建站，需找到 article body；有 Spotify playlist 嵌入可直接提取 track_id |
| **robots.txt** | ✅ 無 AI 封鎖 |
| **重點** | 每月從全球精選 top tracks；diversity 覆蓋廣 |
| **解決問題** | world -6，多類型多樣性 |

**建議 parser 策略：**
- 爬取月度 playlist embed（Spotify playlist URI → 批次取得所有曲目）
- 這是最有效率的方式：一個 playlist 可能含 20-30 首已有 track_id 的世界音樂
- 理由改寫：`一位世界音樂策展人認為這首來自 {地區} 的作品代表了當代 {類型} 的新方向`

---

## 實作優先順序建議

```
Phase 1（今日 → 本週）— 緊急類型
  1. thebiaslist.com parser → K-pop +50 首（5 天臨界）
  2. rootfire.net parser → Reggae +30 首（5 天臨界）

Phase 2（本週）— 原始計畫類型
  3. earmilk.com parser → Alternative/Electronic +30 首
  4. stereofox.com parser → Alternative/Indie +30 首

Phase 3（下週）— 完整計畫
  5. metalsucks.net parser → Metal（解決 8x 失衡）
  6. undertheradarmag.com parser → Alternative
  7. worldmusiccentral.org + rootsandchordsmusic.com → World music
```

---

## Calvin 決策需求

- [ ] **確認 Content Harvest 已替代 Outreach 招募**（依 handover-session-2026-03-26.md）→ Outreach agent 可正式轉型/停用
- [ ] **授權 dev session 實作 Phase 1 parsers**（The Bias List + Rootfire）
- [ ] 確認理由改寫方式：LLM 批次（較自然但費用+）vs 模板格式（免費但固定）

---

## 相關檔案

- 原始設計: `paperclip/inbox/handover-content-harvest.md`
- 2026-03-26 招募草稿（已超越）: `paperclip/drafts/curator-outreach-2026-03-26.md`
- CEO 緊急狀態: `paperclip/logs/ceo-latest.md`
