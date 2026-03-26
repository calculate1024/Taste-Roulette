# Session Handover: Paperclip 營運 (2026-03-26)

> 交接對象: 開發 session / 下一次 Paperclip session
> 日期: 2026-03-26

---

## 本 Session 完成事項

### 1. GitHub Actions 排程拆分
- **檔案**: `.github/workflows/paperclip-agents.yml` (morning) + `paperclip-social.yml` (evening)
- **改動**: 原本 7 個 agent 全在 UTC 23:00 一次跑，現拆為：
  - Morning (UTC 22:00 = 06:00+8): Curator → CEO → DevOps → Analytics → Quality → Bug Triage
  - Evening (UTC 10:00 = 18:00+8): Social agent 單獨跑
- **費用追蹤**: 每個 agent 用 `--output-format json` 取得 `total_cost_usd`，寫入 `paperclip/logs/cost-{date}.md` + `cost-tracker.json`

### 2. P0 Inbox 指令
- **P0-1 World Wanderer**: 已寫入 `paperclip/inbox/curator.md`（批准 193 筆 + 單 curator 月上限 50 首）→ **已被 agent 處理並刪除**
- **P0-2 孤兒 metadata**: 同上，Curator agent 下次 heartbeat 處理
- **P0-3 streak_count**: 確認非 bug — 3 位真實用戶尚未連續開卡，streak 邏輯正確

### 3. README 拆分
- **主 README** (`README.md`): 移除 Paperclip 詳細內容，保留索引連結
- **新檔** (`paperclip/README.md`): 完整 Paperclip 操作手冊（架構、agent 一覽、排程、inbox 機制、費用追蹤、技能清單、安全政策）

### 4. Content Harvest Pipeline 設計
- **檔案**: `paperclip/inbox/handover-content-harvest.md`
- **概要**: 取代 Outreach agent 的招募模式，改為爬取音樂媒體公開推薦
- **目標來源**: Earmilk, Stereofox, Metal Sucks, Under the Radar, World Music Central
- **交給開發 session 實作**: parser + Spotify 匹配 + 理由改寫 + curator profile

### 5. Social 執行
- Discord #general: ✅ 已發（週四歌曲推薦）
- Bluesky: ✅ 已發（genre crossing 主題）
- Twitter: ✅ Calvin 手動發布 Option A（genre crossing 觀察）
- 草稿標記: `paperclip/drafts/twitter-2026-03-26.md` → status: posted

---

## 未完成 / 待後續處理

### 雲端部署（Zeabur）
- **狀態**: 服務建立但 build 未觸發（status UNKNOWN）
- **Zeabur 域名**: `papercliptr.zeabur.app`
- **待做**:
  1. 刪除空服務，重建用 Git Repository (`https://github.com/paperclipai/paperclip.git`)
  2. 建 PostgreSQL addon
  3. 設環境變數（DATABASE_URL, JWT_SECRET, PUBLIC_URL 等）
  4. 部署成功後：`npx paperclipai company import` 匯入本地資料
  5. 更新 GitHub Actions 將 heartbeat 指向雲端 API

### 自製 Dashboard（可移除）
- `paperclip/dashboard/api/index.js` — 原計劃用 Vercel + GitHub API 自建 dashboard
- **決定改用官方 Paperclip 框架**（paperclipai/paperclip）後，這個可以刪除
- `paperclip/dashboard/server.js` 本地版保留作為 fallback

### Outreach Agent 轉型
- 目前 disabled。等 Content Harvest pipeline 上線後：
  - 改名為 Content Harvester 或併入 Curator agent
  - 排程改為每週三執行（配合 Curator 深度分析）
  - 或完全刪除，skill 整合進 Curator

### 費用追蹤驗證
- `--output-format json` 的 `total_cost_usd` 欄位需要在下次 GitHub Actions 跑完後驗證是否正確回報
- 如果格式不對，fallback 用 Anthropic Usage API 查詢

### Bluesky 憑證
- Social agent 今天報告 auth 已修復（Calvin 重新產生 App Password）
- 需確認 GitHub Secrets 中 `BLUESKY_APP_PASSWORD` 已更新

---

## 關鍵決策記錄

| 決策 | 方向 | 理由 |
|------|------|------|
| World Wanderer 193 筆 | 全數批准 + 月上限 50 首 | Pool 7 天耗盡是 P0，但需防止單一 curator 品味偏差 |
| 孤兒 metadata 413 筆 | 批次 Spotify fetch + 清除無效 | 41% pool 浪費，阻礙配對 |
| Outreach 轉型 | 爬取 > 招募 | 推薦匿名，不需對方加入；爬取即時有效 |
| Dashboard | 用官方 Paperclip 框架 | 比自建更完整（React UI + task 管理 + governance） |
| 費用優化 | 暫不調整 | Calvin 明確表示費用不是問題 |
| Agent 排程 | 拆分 morning + evening | 符合 agent 原始設計時間，Social 需獨立於營運 agent |

---

## 檔案變更總覽

| 檔案 | 狀態 |
|------|------|
| `.github/workflows/paperclip-agents.yml` | 修改（morning batch + cost tracking） |
| `.github/workflows/paperclip-social.yml` | 新增（evening Social agent） |
| `.claude/launch.json` | 修改（加入 Paperclip Dashboard dev server） |
| `paperclip/README.md` | 新增（拆分自主 README） |
| `paperclip/drafts/twitter-2026-03-26.md` | 修改（status: posted） |
| `paperclip/inbox/handover-content-harvest.md` | 新增（開發交接） |
| `paperclip/inbox/handover-session-2026-03-26.md` | 新增（本文件） |
| `paperclip/dashboard/api/index.js` | 新增（自建版，待決定是否保留） |
| `paperclip/dashboard/vercel.json` | 新增（同上） |
| `paperclip/dashboard/package.json` | 修改（同上） |
