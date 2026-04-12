# Development Workflow — 開發生命週期

本文件定義 Taste Roulette 從需求到上線的完整工作流程，適用於人類開發者和 AI Agent。

## 概覽

```
需求收集 → 分類評估 → 規劃排期 → 開發實作 → 程式碼審查 → 測試驗證 → 部署上線 → 監控回饋
   │                                                                              │
   └──────────────────────── 持續優化循環 ←──────────────────────────────────────────┘
```

---

## 1. 需求收集 (Intake)

### 來源

| 來源 | 觸發方式 | 責任人 |
|------|---------|--------|
| 產品需求 | Calvin 在 GitHub Issue 或 Paperclip inbox 提出 | Calvin |
| Bug 回報 | 用戶回饋 / Sentry 錯誤 / Bug-Triage agent | 任何人 |
| 優化項目 | Dev-Lifecycle agent 自動掃描 / 開發者提出 | Dev-Lifecycle / 開發者 |
| 技術債 | Code Review 中發現 / 依賴更新 | 開發者 |
| KPI 驅動 | Analytics agent 發現數據異常 | Analytics / CEO |

### 入口規則

所有需求 **必須** 以 GitHub Issue 形式存在，使用對應的 Issue Template：
- Bug → Bug Report template
- 新功能 → Feature Request template
- 優化 → Optimization template

**禁止**：口頭需求、聊天群中的非正式要求、沒有 Issue 的 PR。

---

## 2. 分類評估 (Triage)

### 誰負責 Triage

| 來源 | Triage 責任 |
|------|------------|
| Bug (自動) | Bug-Triage agent 初步分類 → Calvin 確認 |
| Bug (手動) | 建立者初步標註 → Calvin 確認 |
| Feature | Calvin 評估 |
| Optimization | Dev-Lifecycle agent 初步評估 → Calvin 確認 |

### Triage Checklist

- [ ] 指派 **優先級** Label (`P0` ~ `P3`)
- [ ] 指派 **領域** Label (`area:mobile`, `area:api`, etc.)
- [ ] 指派 **階段** Label (如適用)
- [ ] 確認是否為 **重複 Issue**
- [ ] 評估 **影響範圍** 和 **複雜度**
- [ ] 設定 **Milestone** (如適用)
- [ ] 標記 `status:triaged`

### 優先級定義

| 等級 | 定義 | 回應時間 | 範例 |
|------|------|---------|------|
| P0 | 線上事故，核心功能不可用 | 立即 | API 完全當掉、所有用戶收不到卡片 |
| P1 | 嚴重影響，部分用戶受影響 | 24h | Onboarding 失敗、Push 通知中斷 |
| P2 | 重要但不緊急 | 本週 | UI 小問題、非核心功能異常 |
| P3 | 低影響改善 | Backlog | 文字調整、微小效能改善 |

### 複雜度評估

| 等級 | 定義 | 預估時間 |
|------|------|---------|
| S | 簡單改動，1-2 個檔案 | < 2h |
| M | 中等，涉及多個檔案或模組 | 2h - 1 天 |
| L | 大型，跨模組或架構變更 | 1-3 天 |
| XL | 特大，需拆分成多個 PR | > 3 天（必須拆分） |

---

## 3. 規劃排期 (Planning)

### 排期原則

1. **P0 立即處理**，中斷其他工作
2. **P1 插入本週**，盡快開始
3. **P2/P3 在 Sprint Planning 時排入**

### Sprint 節奏

| 時間 | 事件 |
|------|------|
| 每週一 10:00 | Sprint Planning — review backlog，排入本週任務 |
| 每日 | Dev-Lifecycle agent 掃描報告 |
| 每週五 | Sprint Review — demo 完成的功能，review 未完成項 |

### 進入開發的條件 (Definition of Ready)

Issue 必須滿足以下條件才能進入開發：

- [ ] 需求描述**清楚且可執行**
- [ ] 已有**優先級**和**領域** Label
- [ ] 已指派 **Assignee**
- [ ] 如果是 L/XL 複雜度：已有**技術方案**（在 Issue 留言中）
- [ ] 如果涉及 DB schema 變更：已評估**遷移影響**
- [ ] 如果涉及 API 變更：已確認**向後相容性**
- [ ] 標記 `status:planned`

### 技術方案模板（L/XL 複雜度必填）

```markdown
## 技術方案

### 目標
{一句話描述要達成什麼}

### 方案
{描述技術實作方式}

### 影響範圍
- 修改的檔案/模組：
- DB schema 變更：{是/否，描述}
- API 變更：{是/否，描述}
- 向後相容：{是/否}

### 替代方案
{考慮過但未採用的方案，說明原因}

### 風險
{潛在風險和緩解措施}
```

---

## 4. 開發實作 (Development)

### 開發步驟

```
1. git checkout dev && git pull origin dev
2. git checkout -b {branch-type}/{issue-number}-{description}
3. 開發 + 寫測試 + 本地驗證
4. git commit (遵循 Conventional Commits)
5. git push -u origin {branch-name}
6. 開 PR (使用 PR Template)
```

### 開發規範

#### TypeScript (API + Mobile)

- 嚴格模式 (`strict: true` in tsconfig)
- 使用 `camelCase` 命名
- 函式元件 + Hooks，不用 class component
- 狀態管理用 Zustand
- API 呼叫用 TanStack Query
- 錯誤處理：只在系統邊界（用戶輸入、外部 API）做驗證

#### Python (Recommender)

- 使用 `snake_case` 命名
- Type hints 必填
- FastAPI + Pydantic models
- 演算法函數必須有 docstring

#### 資料庫

- Schema 變更 **必須** 用 Supabase migration（`supabase/migrations/`）
- Migration 命名：`{序號}_{描述}.sql`（如 `013_add_taste_history.sql`）
- **禁止** 手動修改 production DB
- **禁止** destructive operations（DROP、DELETE、TRUNCATE）未經 Calvin 批准

#### 安全

- 遵循 `paperclip/security-policy.md`
- 不在程式碼中硬編碼 credentials
- API 端點必須有 auth middleware
- 用戶輸入必須驗證和 sanitize
- SQL 使用 parameterized queries

### Issue 狀態更新

開始開發時：
1. 將 Issue Label 改為 `status:in-progress`
2. 在 Issue 留言中簡述開發計畫（可選）

---

## 5. 程式碼審查 (Code Review)

### PR 提交規則

1. PR 標題使用 Conventional Commits 格式
2. 填寫完整的 PR Template
3. 關聯對應的 Issue（`Closes #XX`）
4. PR 變更不超過 **400 行**（不含自動生成的檔案）
5. CI 全部通過

### Review 流程

```
PR 開啟 → CI 檢查 → Reviewer 審查 → 修改（如需要）→ 批准 → 合併
```

詳細的 Review 標準請參考 [code-review-guidelines.md](code-review-guidelines.md)。

### Review 角色

| 變更類型 | 需要 Review 的人 |
|---------|-----------------|
| 一般功能 | 至少 1 位開發者 |
| DB Migration | Calvin |
| API 公開端點變更 | Calvin |
| 安全相關 | Calvin |
| Paperclip agent 設定 | Calvin |

---

## 6. 測試驗證 (Testing)

### CI 自動測試

每個 PR 會自動執行：

1. **Lint** — ESLint (TS) + Ruff (Python)
2. **Type Check** — `tsc --noEmit`
3. **Unit Test** — Jest (API) + pytest (Recommender)
4. **Build Check** — 確認可以成功 build

### 手動驗證

合併到 `dev` 後：

1. 在 **Expo Go** 上測試 mobile 功能
2. 測試 **Golden Path**（主要使用場景）
3. 測試 **Edge Cases**（空狀態、錯誤狀態、邊界值）
4. 如涉及 UI：**截圖/錄影** 附在 Issue 中

### 完成定義 (Definition of Done)

- [ ] 所有 CI 檢查通過
- [ ] Code Review 已批准
- [ ] 手動驗證完成（如需要）
- [ ] PR 描述中的 Test Plan 全部完成
- [ ] 無遺留的 TODO 或 FIXME（除非另建 Issue 追蹤）
- [ ] 文件已更新（如適用）

詳細的測試標準請參考 [testing-standards.md](testing-standards.md)。

---

## 7. 部署上線 (Deploy)

### 部署流程

```
dev 分支合併 PR → 手動觸發 dev → main PR → 合併 → Vercel 自動部署
```

### 部署檢查

| 步驟 | 負責 | 驗證方式 |
|------|------|---------|
| API 部署 | Vercel 自動 | `curl https://taste-roulette.vercel.app/api/health` |
| Mobile Build | 手動觸發 EAS Build | Expo Dashboard |
| DB Migration | 手動執行 | Supabase Dashboard |
| 推薦引擎 | Railway 自動 | `/engine/health` |

### Rollback 計畫

- **API**: Vercel 支援一鍵 rollback 到上一個 deployment
- **DB**: Migration 必須寫 **down migration**（回滾腳本）
- **Mobile**: 透過 OTA Update (Expo Updates) 或重新發布

---

## 8. 監控回饋 (Monitor)

### 自動監控

| 系統 | Agent | 頻率 |
|------|-------|------|
| API 健康 | DevOps | 每 30 分鐘 |
| 錯誤率 | Bug-Triage | 每日 |
| KPI | Analytics | 每日 |
| 程式碼品質 | Dev-Lifecycle | 每日 |
| 內容品質 | Quality | 每日 |

### 回饋循環

監控發現的問題會自動回到**步驟 1 (需求收集)**：

1. **Sentry 錯誤** → Bug-Triage agent 建立 Issue
2. **KPI 異常** → Analytics agent 通知 CEO → Calvin 評估
3. **程式碼品質問題** → Dev-Lifecycle agent 建立 Optimization Issue
4. **用戶回饋** → Feedback agent 彙整 → Calvin 評估

---

## RACI 矩陣

| 活動 | Calvin | 開發者 | CEO Agent | Dev-Lifecycle |
|------|--------|--------|-----------|---------------|
| 需求定義 | A/R | C | I | — |
| Triage | A | R | C | C |
| Sprint Planning | A | R | C | I |
| 開發 | I | R | — | — |
| Code Review | A* | R | — | — |
| 測試 | I | R | — | — |
| 部署 | A | R | I | — |
| 監控 | I | — | R | R |
| 優化發現 | I | C | C | R |

> R = Responsible, A = Accountable, C = Consulted, I = Informed
> A* = Calvin 只需 review DB/API/安全相關變更

---

## 附錄：決策權矩陣

| 決策 | 誰決定 | 誰被通知 |
|------|--------|---------|
| 是否修復某個 Bug | Calvin (P0/P1) / 開發者 (P2/P3) | CEO Agent |
| 功能是否進入 Sprint | Calvin | 開發者 |
| 技術方案選擇 | 開發者（L 以下） / Calvin（XL） | CEO Agent |
| DB Schema 變更 | Calvin | DevOps |
| 是否 Rollback | Calvin | 所有人 |
| 架構重構 | Calvin | 所有人 |
| 依賴升級 (major) | Calvin | DevOps |
| 依賴升級 (minor/patch) | 開發者 | DevOps |
