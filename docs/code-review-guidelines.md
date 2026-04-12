# Code Review Guidelines — 程式碼審查指南

## 為什麼 Review 重要

- 及早發現 Bug 和設計問題
- 知識共享，減少 Bus Factor
- 維持程式碼品質一致性
- 新成員學習的最佳方式

---

## Reviewer 職責

### 必須檢查

1. **正確性** — 邏輯是否正確？邊界條件是否處理？
2. **安全性** — 有無注入風險？認證是否正確？Credentials 是否外洩？
3. **測試** — 有寫測試嗎？測試覆蓋關鍵路徑嗎？
4. **向後相容** — API 變更是否破壞現有 client？DB migration 可否 rollback？
5. **效能** — 是否有 N+1 query？不必要的計算？記憶體洩漏？

### 應該檢查

6. **可讀性** — 命名清楚嗎？結構好理解嗎？
7. **設計** — 職責劃分合理嗎？是否過度抽象或重複？
8. **錯誤處理** — 失敗場景處理得當嗎？用戶會看到什麼？

### 不需要糾結

- 純粹風格偏好（交給 ESLint/Prettier）
- 完美主義的重構建議（另開 Issue）
- 無關本次 PR 的改進

---

## Author 職責

### 開 PR 前

- [ ] 自己先 review 一遍 diff
- [ ] 確認 CI 通過
- [ ] PR 描述清楚說明 **為什麼** 做這個改動
- [ ] 如果 PR 較大，在描述中提供 **review 順序建議**
- [ ] 移除 debug code、console.log、TODO hack

### PR 描述要求

```markdown
## Summary
{1-3 行描述改了什麼和為什麼}

## Changes
- {具體改動 1}
- {具體改動 2}

## Test Plan
- [ ] {測試項目 1}
- [ ] {測試項目 2}

## Screenshots (如涉及 UI)
{截圖或錄影}

Closes #{issue-number}
```

### 回應 Review

- 所有 comment 都要回應（即使只是 "Done"）
- 不同意時，**解釋原因**而非忽略
- 大的設計討論移到 Issue，不在 PR comment 中展開

---

## Review 流程

### 1. 初步掃描 (2 分鐘)

- PR 大小合理嗎？（< 400 行）
- CI 通過了嗎？
- 描述清楚嗎？
- 有關聯 Issue 嗎？

### 2. 理解意圖 (5 分鐘)

- 讀 PR 描述和關聯 Issue
- 理解 **為什麼** 做這個改動
- 確認改動範圍是否合理（沒有夾帶無關變更）

### 3. 逐檔案 Review

**建議 review 順序**：
1. Schema / Model 變更 → 理解資料結構
2. Service / 商業邏輯 → 理解核心改動
3. Route / Controller → 理解介面
4. Tests → 確認測試覆蓋
5. UI Components → 理解用戶體驗
6. Config / 其他 → 收尾

### 4. 給出結論

| 動作 | 意義 |
|------|------|
| **Approve** | 沒有 blocking issues，可以合併 |
| **Request Changes** | 有必須修改的問題，修完後重新 review |
| **Comment** | 有問題或建議但不 block 合併 |

---

## Comment 規範

### 前綴系統

使用前綴讓 author 快速理解 comment 的重要程度：

| 前綴 | 意義 | 是否必須處理 |
|------|------|-------------|
| `[blocking]` | 必須修改才能合併 | 是 |
| `[suggestion]` | 建議改善，author 可自行判斷 | 否 |
| `[question]` | 需要解釋，可能影響判斷 | 需要回應 |
| `[nit]` | 微小問題，不影響合併 | 否 |
| `[praise]` | 做得好的地方 | — |

### 範例

```
[blocking] 這裡缺少 auth middleware，未登入的用戶可以直接存取。

[suggestion] 這個 if-else 可以用 early return 簡化，會更好讀。

[question] 為什麼這裡選擇 0.5 作為閾值？有數據支撐嗎？

[nit] typo: "recieve" → "receive"

[praise] 這個 factory pattern 的設計很乾淨，讚。
```

### 語氣指南

- **對事不對人**：「這段邏輯可能有問題」而非「你寫錯了」
- **提問而非命令**：「是否考慮過 X 方案？」而非「改成 X」
- **給出原因**：「建議用 Map 因為查找是 O(1)」而非只說「用 Map」
- **肯定好的部分**：不要只給負面回饋

---

## 特殊場景

### P0/P1 緊急修復

- 可以 **先合併後 Review**
- 但事後必須補 Review，如有問題開 follow-up Issue
- 合併時在 PR 中標註 `[EMERGENCY]`

### AI Agent 產生的 PR

- Paperclip agents 可能提出自動化的 PR
- **同樣需要人工 Review**
- 特別注意：安全性、是否符合產品方向、是否引入不必要的變更

### 大型重構

- 如果 PR > 400 行，要求 author 拆分
- 例外：自動生成的 migration、依賴升級的 lock file
- 拆分建議：按模組、按功能層級、按 prepare → implement → cleanup

---

## Checklist 速查表

**Reviewer 速查**：
- [ ] PR 大小 < 400 行
- [ ] CI 全部通過
- [ ] 有對應 Issue
- [ ] 邏輯正確，無明顯 bug
- [ ] 無安全風險
- [ ] 有適當的測試
- [ ] 無效能問題
- [ ] 命名清楚、結構合理

**安全 Review 重點** (API 變更時)：
- [ ] 所有端點有 auth middleware
- [ ] 用戶輸入有 validation
- [ ] SQL 使用 parameterized queries
- [ ] 無 credentials 硬編碼
- [ ] 錯誤訊息不洩漏內部資訊
- [ ] Rate limiting 有設定（如適用）

**DB Migration Review 重點**：
- [ ] 有 down migration（rollback）
- [ ] 不會鎖表太久
- [ ] 新欄位有合理的 default value
- [ ] Index 有建在常用查詢的欄位上
- [ ] 不破壞現有資料
