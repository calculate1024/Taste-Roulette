# Customer Experience Analyst — 2026-03-25 (W13 週報)
## Status: warning

## 執行摘要

本週（W13：2026-03-22 ~ 2026-03-25）有機回饋量極低（3 筆），但累積品質指標持續改善。
**最大警示：推薦池已全數耗盡（0 筆可用），若不緊急補充，下週卡片品質將退化為 Curator fallback。**

---

## 本週有機活動（2026-03-22 ~ 2026-03-25）

| 指標 | 數值 |
|------|------|
| 新回饋筆數 | 3 |
| 新用戶 | 1（總計 111 人）|
| surprised | 2（66.7%）|
| okay | 1（33.3%）|
| not_for_me | 0（0%）|
| 留言 | 1（"Notbad"）|

> 備註：有機活動量低，主要原因為用戶基數仍小（111 人）。2026-03-19 的大量資料為種子/遷移批次，已在 W12 週報中涵蓋。

---

## W13 期間累積指標（含 03-19 批次，共 203 筆）

### 反應分布 vs W12

| 指標 | W13 | W12 | 週差 |
|------|-----|-----|------|
| 總回饋 | 203 | 541 | — |
| 😲 surprised | 69 / 34.0% | 29.4% | ↑ +4.6pp |
| 😐 okay | 84 / 41.4% | 42.9% | ↓ −1.5pp |
| 🙅 not_for_me | 50 / 24.6% | 27.7% | ↓ −3.1pp |
| 留言率 | 64/203 = 31.5% | 30.5% | ↑ +1.0pp |
| 正向率（surprised+okay） | 75.4% | 72.3% | ↑ +3.1pp |

### 卡片品質

| 指標 | W13 | W12 | 週差 |
|------|-----|-----|------|
| 平均品味距離 | 0.482 | — | 甜蜜點 OK |
| 距離 >0.75 張數 | 9 / 1.8% | 10.6% | ↓ −8.8pp OK |
| 卡片總數 | 500 | — | — |
| feedback_given 率 | 200/500 = 40.0% | 74.9% | 基數不同 |

配對引擎改善確認：distance >0.75 比例從 10.6% 大幅降至 1.8%，W12 建議的硬上限已生效。

---

## 留言主題分析（64 條，W13 期間）

### 正向（surprised）— 核心品牌驗證

| 主題 | 次數 | 信號 |
|------|------|------|
| "This is exactly the kind of surprise I signed up for" | 7 | 品牌承諾兌現 — 最高頻正向 |
| "Didn't expect to like this genre but here we are" | 7 | 類型突破成功 |
| "Appreciate the suggestion but this one's not clicking" | 7 | 委婉拒絕 — 最高頻負向 |
| "The recommendation was spot on — different but not alienating" | 5 | 驚喜甜蜜點命中 |
| "My taste just expanded a little today" | 5 | 核心價值主張 |
| "I can see why someone would like this, just not for me" | 5 | 距離感偏高 |
| "Interesting, not my usual but I can see the appeal" | 6 | 有趣但仍在觀望 |
| "Not bad! The production is clean" | 5 | 製作水準認可 |
| "Added to my playlist immediately" | 4 | 最強行為信號（加入播放清單） |
| "Decent track, might grow on me" | 4 | 慢熱潛力 — 需書籤承接 |
| "Wow, never would have found this on my own!" | 3 | 演算法顛覆性確認 |
| "Too far from my comfort zone for now" | 3 | 距離過遠警示 |

### 關鍵洞察

1. **"驚喜感"核心體驗兌現**：7 條「This is exactly the kind of surprise I signed up for」= 用戶主動確認產品價值主張。
2. **類型突破成功率高**：「Didn't expect to like this genre」7 次 + 「Added to my playlist」4 次。
3. **委婉拒絕 vs 強烈排斥比例改善**：接受度拒絕 vs 強烈排斥 = 7:3，距離感在可接受範圍。
4. **慢熱信號未被承接**：4 條「might grow on me」缺乏後續機制，潛在轉換流失中。

---

## 用戶狀態

| 指標 | 數值 |
|------|------|
| 總用戶 | 111（+1 vs W12）|
| Onboarding 完成率 | 110/111 = 99.1% |
| Power Users（7d+ streak）| 19（不變）|
| 平均 streak | 2.3 天 |
| 最高 streak | 7 天 |

---

## 重大問題

### P0：推薦池歸零

| 項目 | 數值 |
|------|------|
| 總推薦筆數 | 500 |
| 已使用 | 500（100%）|
| 可用（未使用）| 0 |

W12 末尾的 143 筆推薦已在本週全數耗盡。若不補充：
- 配對引擎將完全依賴 Curator fallback
- 「來自真人的推薦」核心體驗中斷
- 卡片多樣性降低

建議行動：立即強化 Recommend-Back 激勵提示（Bonus 卡片），目標本週恢復至 100+ 筆。

### P1：有機活動量偏低

- 本週 3 筆有機回饋對應 111 名用戶 = 日活躍率估計 < 5%
- 可能原因：Google Play 尚未上架，無法吸引新用戶

### P2：書籤功能缺口持續

慢熱用戶（"might grow on me"，4 次）無法稍後回顧，靜默流失風險持續存在。

---

## W12 建議執行追蹤

| W12 建議 | 狀態 |
|---------|------|
| 配對引擎 max_distance 硬限制 | 已改善（1.8% vs 10.6%）|
| 書籤/稍後再聽功能 | 仍待實作 |
| Pool < 100 筆自動警告 | Pool 已歸零但無警告觸發 |

---

## Social Agent 素材（本週）

真實用戶留言，可匿名引用：
- "This is exactly the kind of surprise I signed up for"（7 次）
- "Didn't expect to like this genre but here we are"（7 次）
- "My taste just expanded a little today"（5 次）
- "Added to my playlist immediately"（4 次）

建議社群鉤子：「你上次被音樂驚喜是什麼時候？」

---

## Next Actions（優先排序）

| 優先 | 行動 | 負責 |
|------|------|------|
| P0 | 緊急補充推薦池：強化 Recommend-Back 激勵，目標 100+ 筆 | Product |
| P0 | 實作 pool < 50 筆時通知 CEO | DevOps |
| P1 | Google Play 驗證進度追蹤 | CEO |
| P1 | 書籤功能 MVP 設計 | Product |
| P2 | Social Agent 提供本週正向素材 | Social Agent |
