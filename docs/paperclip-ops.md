# Taste Roulette — Paperclip 經營階段轉移計畫

## 概述

MVP 開發完成（Week 14）後，將日常經營工作從人工操作轉移到 Paperclip AI agent 編制。
Paperclip 作為 AI agent 的「控制面板」，讓多個 AI agent 像公司員工一樣各司其職，
而你（Calvin）扮演 Board of Directors 角色——審批策略、監控預算、在關鍵節點做決定。

## Paperclip 基礎設定

### 安裝

```bash
# 本地開發
npx paperclipai onboard --yes
# 啟動後在 http://localhost:3100 管理

# 正式部署（之後可遷移到 Vercel + Postgres）
# 使用 Tailscale 遠端存取
```

### 公司結構

```
Taste Roulette (Company)
├── CEO Agent (Claude Code)
│   ├── 負責：整體策略執行、跨團隊協調
│   └── 審批：需要 Calvin 核准重大決策
│
├── Content Operations
│   ├── Curator Agent
│   │   ├── 每日從 Spotify Editorial / Bandcamp 挖掘新曲目
│   │   ├── 維護種子推薦池（確保多元性）
│   │   └── 工具：Spotify API, web search
│   │
│   └── Quality Agent
│       ├── 審核用戶提交的推薦（過濾 spam、不當內容）
│       ├── 監控推薦池的類型分布是否平衡
│       └── 工具：content moderation API, DB queries
│
├── Growth & Community
│   ├── Analytics Agent
│   │   ├── 每日產出 KPI dashboard
│   │   ├── D7 retention、open rate、surprise score 趨勢
│   │   ├── 異常偵測（突然掉 retention → 告警）
│   │   └── 工具：PostHog API, Supabase queries
│   │
│   ├── Social Agent
│   │   ├── 生成社群貼文素材（IG、Twitter）
│   │   ├── 用戶 UGC 亮點整理
│   │   ├── 回覆社群留言（需 Calvin 核准再發布）
│   │   └── 工具：image generation, social scheduling
│   │
│   └── Outreach Agent
│       ├── 尋找潛在 Curator 人選（音樂部落客、DJ）
│       ├── 起草邀請訊息
│       ├── 追蹤回覆狀態
│       └── 工具：web search, email draft
│
├── Engineering Operations
│   ├── DevOps Agent (Claude Code)
│   │   ├── 監控 API 健康、回應時間
│   │   ├── 自動處理常見部署問題
│   │   ├── 資料庫效能監控
│   │   └── 工具：Sentry, Vercel, Railway APIs
│   │
│   └── Bug Triage Agent
│       ├── 整理 Sentry 錯誤報告
│       ├── 分類優先級
│       ├── 提供修復建議
│       └── 工具：Sentry API, GitHub Issues
│
└── Customer Experience
    └── Feedback Agent
        ├── 整理 App Store / Google Play 評論
        ├── 分類用戶回饋主題
        ├── 每週摘要報告
        └── 工具：app store APIs, sentiment analysis
```

## Agent 設定範例

### Curator Agent

```yaml
# paperclip agent config
name: curator
title: Content Curator
reports_to: ceo
platform: claude-code
budget_monthly: $50  # API 呼叫費用上限

schedule:
  heartbeat: "0 6 * * *"  # 每天早上 6 點
  
skills:
  - spotify-discovery    # 搜尋新音樂
  - track-analysis       # 分析曲目特徵
  - pool-management      # 管理推薦池

goals:
  - "維持推薦池至少 200 首未使用曲目"
  - "確保池中涵蓋至少 12 種音樂類型"
  - "每日新增 5-10 首高品質推薦"
  - "避免重複推薦同一藝人超過 3 次/月"
```

### Analytics Agent

```yaml
name: analytics
title: Data Analyst
reports_to: ceo
platform: claude-code
budget_monthly: $30

schedule:
  heartbeat: "0 9 * * *"  # 每天早上 9 點出報告
  weekly: "0 9 * * 1"     # 週一出週報

skills:
  - posthog-query
  - supabase-query
  - report-generation

goals:
  - "每日產出 KPI snapshot (retention, open rate, surprise score)"
  - "每週產出趨勢分析報告"
  - "異常指標立即通知 Calvin"
  - "追蹤 A/B 測試結果"
```

## 經營階段工作流程

### 每日自動化 (Agent 處理)

```
06:00  Curator Agent 醒來
       → 搜尋新曲目、檢查推薦池狀態
       → 必要時補充新推薦

07:00  配對引擎 cron job
       → 為所有活躍用戶生成今日卡片

08:00  推送通知發送
       → 「你今天的驚喜到了 🎲」

09:00  Analytics Agent 醒來
       → 產出昨日 KPI snapshot
       → 檢查是否有異常
       → 通知 Calvin（如有需要）

10:00  Quality Agent 醒來
       → 審核昨日用戶提交的推薦
       → 過濾不當內容
       → 更新推薦池

18:00  Social Agent 醒來
       → 準備明日社群貼文草稿
       → 等待 Calvin 核准
```

### 每週 Calvin 操作 (30-60 分鐘)

```
週一：
  □ 審閱 Analytics Agent 週報
  □ 核准/修改 Social Agent 的本週貼文計畫
  □ 檢查 Paperclip dashboard（預算消耗、agent 健康）

週四：
  □ 審閱 Feedback Agent 的用戶回饋摘要
  □ 決定是否需要功能調整
  □ 審批 Outreach Agent 的 Curator 邀請信
```

### 每月 Calvin 操作 (2-3 小時)

```
□ 深度數據回顧：月度趨勢、cohort 分析
□ Agent 效能評估：調整 budget、目標、skill
□ 產品方向決策：是否擴展到電影/書籍
□ 財務回顧：收入 vs 支出、runway
□ Paperclip org 調整：新增/移除 agent
```

## 成本預估 (Paperclip 經營階段)

| 項目 | 月費 | 備註 |
|------|------|------|
| Supabase Pro | $25 | DB + Auth + Storage |
| Vercel Pro | $20 | API hosting |
| Railway | $10 | Python recommender |
| Expo EAS | $0-99 | 依 build 量 |
| Paperclip Agents (API 費用) | $100-200 | Claude API calls |
| Spotify API | $0 | 免費額度 |
| PostHog | $0 | 免費額度 (1M events) |
| Sentry | $0 | 免費額度 |
| **月度總計** | **$155-354** | |

## 從 Claude Code 到 Paperclip 的轉移步驟

### Step 1: MVP 完成後 (Week 14-15)
- [ ] 安裝 Paperclip（本地或 VPS）
- [ ] 建立 Taste Roulette company
- [ ] 設定 CEO agent（Claude Code 作為 runtime）

### Step 2: Content Ops 上線 (Week 15-16)
- [ ] Curator Agent 設定 + skill 撰寫
- [ ] Quality Agent 設定
- [ ] 測試：Curator 能否自動補充推薦池
- [ ] 觀察一週，手動介入修正

### Step 3: Analytics + DevOps 上線 (Week 16-17)
- [ ] Analytics Agent 設定 + PostHog 串接
- [ ] DevOps Agent 設定 + Sentry 串接
- [ ] Bug Triage Agent 設定
- [ ] 驗證：每日 KPI snapshot 是否準確

### Step 4: Growth 上線 (Week 17-18)
- [ ] Social Agent 設定
- [ ] Outreach Agent 設定
- [ ] Feedback Agent 設定
- [ ] Calvin 核准流程驗證

### Step 5: 全面自治 (Week 19+)
- [ ] 所有 agent 穩定運作
- [ ] Calvin 轉為 Board 模式（每週 30-60 分鐘）
- [ ] 持續優化 agent skills 和 goals
- [ ] 評估擴展：新垂直領域、新市場

## Paperclip SKILL.md 範本

為各 agent 準備的 skill 檔案放在：

```
taste-roulette/
├── paperclip/
│   ├── company.yaml           # 公司設定
│   ├── agents/
│   │   ├── curator.yaml
│   │   ├── quality.yaml
│   │   ├── analytics.yaml
│   │   ├── social.yaml
│   │   ├── outreach.yaml
│   │   ├── devops.yaml
│   │   ├── bug-triage.yaml
│   │   └── feedback.yaml
│   └── skills/
│       ├── spotify-discovery/
│       │   └── SKILL.md
│       ├── pool-management/
│       │   └── SKILL.md
│       ├── posthog-query/
│       │   └── SKILL.md
│       └── report-generation/
│           └── SKILL.md
```

## 關鍵提醒

1. **Paperclip 是 orchestrator，不是 runtime** — Agent 的實際執行還是靠 Claude Code/其他 LLM
2. **所有發布動作需 Calvin 核准** — 社群貼文、Curator 邀請、功能上線
3. **預算控制是安全網** — 每個 agent 有月度上限，防止失控
4. **Immutable audit log** — 所有 agent 行為都被記錄，可追溯
5. **先從 Content Ops 開始** — 最容易自動化、最容易驗證效果
