# Contributing to Taste Roulette

歡迎加入 Taste Roulette 開發！本文件定義了團隊協作的規範與流程。

## 目錄

- [快速開始](#快速開始)
- [分支策略](#分支策略)
- [Issue 管理](#issue-管理)
- [開發流程](#開發流程)
- [Commit 規範](#commit-規範)
- [Pull Request 流程](#pull-request-流程)
- [Code Review 規範](#code-review-規範)
- [測試要求](#測試要求)
- [持續優化機制](#持續優化機制)

---

## 快速開始

### 環境需求

| 工具 | 版本 |
|------|------|
| Node.js | >= 18 |
| Python | >= 3.10 |
| pnpm | >= 8 |
| Expo CLI | latest |

### 本地啟動

```bash
# 1. Clone & install
git clone https://github.com/calculate1024/taste-roulette.git
cd taste-roulette
cp .env.example .env  # 填入必要的環境變數

# 2. API server
cd apps/api && pnpm install && pnpm dev

# 3. Mobile (另一個 terminal)
cd apps/mobile && pnpm install && npx expo start

# 4. Recommender (可選)
cd apps/recommender && pip install -r requirements.txt && uvicorn app.main:app --reload
```

### 環境變數

參考 `.env.example`。**絕對不要** 將 `.env` 提交到 Git。

---

## 分支策略

```
main                    ← 穩定版本，僅透過 PR 合併
├── dev                 ← 開發整合分支
│   ├── feature/xxx     ← 新功能
│   ├── fix/xxx         ← Bug 修復
│   ├── refactor/xxx    ← 重構
│   ├── optimize/xxx    ← 效能或品質優化
│   └── chore/xxx       ← 建構、CI、文件等
```

### 命名規則

| 類型 | 格式 | 範例 |
|------|------|------|
| 功能 | `feature/{issue-number}-{簡述}` | `feature/42-daily-card-animation` |
| 修復 | `fix/{issue-number}-{簡述}` | `fix/87-push-notification-crash` |
| 重構 | `refactor/{簡述}` | `refactor/api-error-handling` |
| 優化 | `optimize/{簡述}` | `optimize/taste-vector-query` |
| 雜項 | `chore/{簡述}` | `chore/update-dependencies` |

### 規則

1. **永遠從 `dev` 分出新分支**
2. **永遠透過 PR 合併回 `dev`**，不允許直接 push
3. **`main` 只接受從 `dev` 合併的 PR**，需至少 1 位 reviewer 批准
4. 分支生命週期不超過 **1 週**，超過需拆分

---

## Issue 管理

### Issue 類型

我們使用 GitHub Issue Templates 分為三類：

| 類型 | Label | 用途 |
|------|-------|------|
| Bug Report | `bug` | 已知的錯誤或異常行為 |
| Feature Request | `feature` | 新功能需求 |
| Optimization | `optimization` | 效能、程式品質、UX 優化 |

### Label 系統

**優先級**：
- `P0-critical` — 線上事故，立即處理
- `P1-high` — 嚴重影響用戶體驗，24h 內處理
- `P2-medium` — 重要但不緊急，排入本週
- `P3-low` — Nice-to-have，排入 backlog

**狀態**：
- `status:triaged` — 已分類，待規劃
- `status:planned` — 已排入迭代
- `status:in-progress` — 開發中
- `status:review` — 等待 review
- `status:blocked` — 被阻塞，需說明原因

**領域**：
- `area:mobile` — React Native / Expo
- `area:api` — Node.js backend
- `area:recommender` — Python taste engine
- `area:infra` — CI/CD、部署、監控
- `area:paperclip` — AI agent 框架

**階段**：
- `phase:0`, `phase:1`, `phase:2`, `phase:3` — 對應開發階段

### Issue 生命週期

```
Created → Triaged → Planned → In Progress → Review → Done
              ↓
           Rejected (won't fix / duplicate / out of scope)
```

每個 Issue 必須有：
1. **清楚的標題**（中英文皆可）
2. **至少一個 Label**（類型 + 優先級）
3. **Assignee**（進入 Planned 後）
4. **關聯的 Milestone**（如適用）

---

## 開發流程

完整的端到端流程請參考 [docs/dev-workflow.md](docs/dev-workflow.md)。

### 簡要流程

```
1. 需求          Issue 建立 + Triage
2. 規劃          Issue 指派 + 設計討論（必要時）
3. 開發          建分支 → 寫程式 → 寫測試 → 本地驗證
4. 程式碼審查    開 PR → CI 通過 → Reviewer 審查
5. 測試          Review 通過 → 合併到 dev → 驗證
6. 部署          dev → main PR → 自動部署 Vercel
```

---

## Commit 規範

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Type

| Type | 說明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修復 |
| `refactor` | 重構（不改變行為） |
| `perf` | 效能改善 |
| `test` | 測試新增或修改 |
| `docs` | 文件變更 |
| `chore` | 建構、CI、依賴更新 |
| `style` | 格式調整（不影響邏輯） |

### Scope

| Scope | 對應 |
|-------|------|
| `mobile` | apps/mobile/ |
| `api` | apps/api/ |
| `recommender` | apps/recommender/ |
| `db` | supabase/ |
| `paperclip` | paperclip/ |
| `ci` | .github/workflows/ |

### 範例

```
feat(api): add daily card delivery endpoint

Implements GET /api/roulette/today with taste-distance filtering.
Closes #42

fix(mobile): prevent crash when preview_url is null

perf(recommender): cache taste vectors to reduce matching latency

chore(ci): add TypeScript type-check step to CI pipeline
```

### 規則

- 標題不超過 **72 字元**
- 使用**英文**撰寫 commit message
- 標題使用**祈使語氣**（add, fix, update，不是 added, fixes, updated）
- Body 解釋 **why**，不只是 what

---

## Pull Request 流程

### 開 PR 前的 Checklist

- [ ] 本地測試通過 (`pnpm test` / `pytest`)
- [ ] TypeScript 型別檢查通過 (`pnpm tsc --noEmit`)
- [ ] ESLint 無錯誤 (`pnpm lint`)
- [ ] 已更新相關文件（如有需要）
- [ ] PR 標題遵循 Conventional Commits 格式
- [ ] PR 描述填寫完整（使用 PR template）

### PR 規則

1. **每個 PR 對應一個 Issue**（或一個明確的任務）
2. **PR 不超過 400 行變更**（超過請拆分）
3. **至少 1 位 reviewer 批准**才能合併
4. **CI 必須全部通過**才能合併
5. 使用 **Squash and merge** 合併到 dev
6. 合併後**刪除分支**

### Review 回應時間

| 優先級 | 期望回應時間 |
|--------|-------------|
| P0 | 2 小時內 |
| P1 | 12 小時內 |
| P2 | 24 小時內 |
| P3 | 48 小時內 |

詳細的 Review 規範請參考 [docs/code-review-guidelines.md](docs/code-review-guidelines.md)。

---

## 測試要求

詳細標準請參考 [docs/testing-standards.md](docs/testing-standards.md)。

### 基本要求

| 層級 | 工具 | 覆蓋率目標 |
|------|------|-----------|
| API | Jest | 核心邏輯 >= 80% |
| Recommender | pytest | 演算法 >= 90% |
| Mobile | Jest + React Native Testing Library | 關鍵元件 >= 70% |

### 什麼必須寫測試

- 新增的 API endpoint
- 推薦引擎演算法邏輯
- 資料模型驗證
- 關鍵 UI 互動（onboarding、feedback、card flip）

### 什麼可以不寫測試

- 純樣式調整
- 靜態文字修改
- 第三方 SDK 的 wrapper（已有上游測試）

---

## 持續優化機制

### Dev-Lifecycle Agent

Paperclip 框架中有一個 `dev-lifecycle` agent，會定期：

1. **掃描程式碼品質** — 找出技術債、重複程式碼、過時依賴
2. **效能審計** — 分析 API 回應時間、DB 查詢效能
3. **安全掃描** — 檢查已知漏洞、不安全的模式
4. **建立 GitHub Issue** — 將發現的優化項自動建立為 `optimization` Issue

### 人工 Review 週期

| 週期 | 內容 |
|------|------|
| 每日 | Dev-Lifecycle agent 自動掃描 |
| 每週一 | CEO agent 在週報中彙整優化建議 |
| 每兩週 | 團隊 Sprint Review — 檢視 optimization backlog |
| 每月 | 架構 Review — 評估是否需要重大重構 |

### 如何提出優化建議

1. 使用 **Optimization** Issue Template 建立 Issue
2. 標註 `optimization` + 影響範圍 label
3. 提供：現狀描述、預期改善、衡量方式
4. 在 Sprint Planning 時排入優先順序

---

## 文件索引

| 文件 | 用途 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | 專案架構與 Claude Code 任務指南 |
| [docs/dev-workflow.md](docs/dev-workflow.md) | 完整開發生命週期流程 |
| [docs/testing-standards.md](docs/testing-standards.md) | 測試規範與策略 |
| [docs/code-review-guidelines.md](docs/code-review-guidelines.md) | Code Review 指南 |
| [docs/development-plan.md](docs/development-plan.md) | 14 週分階段開發計畫 |
| [paperclip/README.md](paperclip/README.md) | Paperclip Agent 框架說明 |
| [paperclip/security-policy.md](paperclip/security-policy.md) | 安全政策 |
