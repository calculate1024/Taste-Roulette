# Testing Standards — 測試規範

## 測試策略

### 測試金字塔

```
         ╱╲
        ╱  ╲         E2E Tests (未來)
       ╱────╲        — Detox / Maestro
      ╱      ╲
     ╱ Integ. ╲      Integration Tests
    ╱──────────╲     — API route tests, DB interactions
   ╱            ╲
  ╱  Unit Tests  ╲   Unit Tests
 ╱────────────────╲  — 函式邏輯、元件渲染、演算法
```

MVP 階段專注在 **Unit + Integration**，暫不要求 E2E。

---

## 各層測試規範

### API (apps/api/) — Jest

#### 覆蓋率目標

| 模組 | 覆蓋率 |
|------|--------|
| `services/` (商業邏輯) | >= 80% |
| `routes/` (API 端點) | >= 70% |
| `utils/` | >= 80% |
| `middleware/` | >= 60% |

#### 必須測試的場景

- **每個 API endpoint**：成功回應 + 至少 1 個錯誤場景
- **認證**：未登入 → 401，無權限 → 403
- **資料驗證**：缺少必填欄位、格式錯誤
- **商業邏輯**：正常路徑 + 邊界條件

#### 測試結構

```
apps/api/
├── src/
│   ├── routes/
│   │   └── roulette.ts
│   └── services/
│       └── matching.ts
└── tests/
    ├── routes/
    │   └── roulette.test.ts     ← Route integration tests
    ├── services/
    │   └── matching.test.ts     ← Unit tests
    └── helpers/
        └── setup.ts             ← Test utilities
```

#### 命名規則

```typescript
describe('MatchingService', () => {
  describe('findSweetSpotMatch', () => {
    it('should return candidates within distance 0.3-0.7', () => { ... });
    it('should prioritize candidates closest to distance 0.5', () => { ... });
    it('should return empty array when no candidates in range', () => { ... });
  });
});
```

- `describe` 用模組或函式名
- `it` 用 "should + 預期行為"
- 一個 `it` 只測一個行為

#### Mock 原則

- **Mock 外部依賴**：Supabase client, Spotify API, Sentry
- **不 Mock 內部邏輯**：services 之間的呼叫儘量用真實實作
- **使用 factory 建立測試資料**，不硬編碼

```typescript
// good — factory
const makeUser = (overrides = {}) => ({
  id: 'test-uuid',
  taste_vector: [0.5, 0.3, 0.8],
  ...overrides,
});

// bad — 硬編碼在每個 test
const user = { id: 'abc', taste_vector: [0.5, 0.3, 0.8], email: '...' };
```

---

### Recommender (apps/recommender/) — pytest

#### 覆蓋率目標

| 模組 | 覆蓋率 |
|------|--------|
| `taste_engine.py` (演算法) | >= 90% |
| `main.py` (API routes) | >= 70% |
| `models.py` | >= 80% |

#### 必須測試的場景

- **品味向量計算**：各種 onboarding 回答組合
- **品味距離**：已知向量的距離計算是否正確
- **甜蜜點配對**：邊界值（恰好 0.3, 恰好 0.7, 無候選人）
- **空值處理**：空向量、缺少 genre 資料

#### 測試結構

```
apps/recommender/
├── app/
│   ├── taste_engine.py
│   └── models.py
└── tests/
    ├── test_taste_engine.py
    ├── test_models.py
    └── conftest.py              ← Shared fixtures
```

#### 演算法測試策略

```python
class TestTasteDistance:
    """品味距離計算 — 確保數學正確性"""

    def test_identical_vectors_distance_zero(self):
        """相同向量距離為 0"""
        v = [1.0, 0.0, 0.5]
        assert taste_distance(v, v) == pytest.approx(0.0)

    def test_orthogonal_vectors_distance_one(self):
        """正交向量距離為 1"""
        assert taste_distance([1, 0], [0, 1]) == pytest.approx(1.0)

    def test_sweet_spot_range(self):
        """驗證甜蜜點範圍過濾"""
        target = make_user(taste_vector=[1, 0, 0])
        candidates = [
            make_user(taste_vector=[0.95, 0.05, 0]),  # too close
            make_user(taste_vector=[0.5, 0.3, 0.2]),   # sweet spot
            make_user(taste_vector=[0, 0, 1]),           # too far
        ]
        matches = find_sweet_spot_match(target, candidates)
        assert len(matches) == 1
```

---

### Mobile (apps/mobile/) — Jest + RNTL

#### 覆蓋率目標

| 模組 | 覆蓋率 |
|------|--------|
| `components/` (關鍵元件) | >= 70% |
| `hooks/` | >= 80% |
| `utils/` | >= 80% |
| `store/` (Zustand) | >= 70% |

#### 必須測試的場景

- **Onboarding 元件**：swipe 互動、進度條、完成觸發
- **Roulette Card**：翻牌動畫觸發、Spotify embed 載入
- **Feedback UI**：三個選項各自的提交行為
- **Hooks**：自訂 hooks 的狀態轉換
- **Store**：Zustand store 的 actions 和 selectors

#### 不需要測試

- 純樣式 / 排版
- 第三方元件的內部行為
- 導航結構（留給未來 E2E）

---

## 測試執行

### 本地執行

```bash
# API
cd apps/api && pnpm test
cd apps/api && pnpm test:coverage    # 含覆蓋率報告

# Recommender
cd apps/recommender && pytest
cd apps/recommender && pytest --cov=app --cov-report=term-missing

# Mobile
cd apps/mobile && pnpm test
```

### CI 自動執行

每個 PR 會觸發 `.github/workflows/ci.yml`：

1. Lint check
2. Type check
3. Unit tests (API + Recommender)
4. Build check

**CI 失敗 = PR 無法合併**。

---

## 測試資料管理

### 原則

1. **測試資料自給自足** — 每個測試自行建立和清理資料
2. **不依賴外部服務** — 所有外部 API 必須 mock
3. **使用 fixture / factory** — 不在測試中硬編碼大段資料
4. **隔離** — 測試之間不共享可變狀態

### Supabase 測試

API integration tests 使用 mock Supabase client：

```typescript
// tests/helpers/setup.ts
export const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};
```

未來可考慮使用 Supabase local (Docker) 做更真實的 integration test。

---

## 什麼時候必須加測試

| 變更類型 | 需要測試？ |
|---------|-----------|
| 新 API endpoint | **是** — route test + service test |
| 新演算法邏輯 | **是** — 至少 3 個場景 |
| Bug fix | **是** — 重現 bug 的 regression test |
| 新 UI 元件（含邏輯） | **是** — render + interaction test |
| 純樣式修改 | 否 |
| 文件修改 | 否 |
| 依賴升級 | 執行既有測試即可 |
| Config / env 變更 | 否 |
| DB Migration | 手動驗證，不需自動測試 |

---

## 測試品質指標

Dev-Lifecycle agent 會定期檢查：

| 指標 | 警告閾值 | 行動 |
|------|---------|------|
| API 整體覆蓋率 | < 60% | 建立 optimization Issue |
| 新 PR 無測試（含邏輯變更） | — | Review 時要求補測試 |
| 測試執行時間 | > 2 分鐘 | 評估是否需要優化 |
| Flaky test 比率 | > 5% | 標記並修復 |
