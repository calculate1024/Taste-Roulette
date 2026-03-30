# Data Analyst — 2026-03-29
## Status: warning

## Summary
- 每日 KPI 快照完成；Cron 執行中（今日僅 1 張卡片，尚未全量）
- 7 日驚喜率達 60.0%（歷史新高，n=10，zero not_for_me）
- Streak P1 bug 第 5 天未解：87cd9416 streak=2（預期 ≥12）

## 每日 KPI 快照 — 2026-03-29

| Metric | Today | Yesterday (3/28) | 7-day Avg | Target | Status |
|--------|-------|-----------------|-----------|--------|--------|
| DAU (login_success) | 0* | 0 | 0.6 | — | ⚠️ |
| 活躍事件用戶 | 1 | 1 | 1 | — | — |
| Cards Delivered | 1† | 121 | ~100 | — | — |
| Open Rate | 100%† | 0.8% | ~1% | 60% | 🔴 |
| Surprise Rate (7d) | — | — | **60.0%** | 25% | ✅ |
| Recommend-back Rate | — | — | — | 30% | — |
| Pool Size (unused) | 1,685 | 1,690 | — | 200+ | ✅ |
| Active Streaks (3+) | 0 | 0 | 0 | — | ⚠️ |

*DAU: 無 login_success 事件，但 PostHog 記錄 14 個 session 事件（session 持續中）
†Cron 仍在執行，今日數字不代表最終值

## Anomalies
- **Open Rate 🔴**：3/28 open rate = 0.8%（121 張卡片只開 1 張）。連續多日低於目標（60%）。根本原因未明：用戶可能未收到推播通知，或 Beta 用戶黏著度不足。
- **DAU 偵測失靈**：login_success 連續多日=0，但 session 事件顯示有真實用戶活躍。須重新定義 DAU（見 Next Actions）。

## Pool Health
- Unused pool: 1,685 (+102 bulk 新增 vs 昨日總量)
- 今日消耗: -5（估計，cron 進行中）
- Days until depletion（at 121/day）: ~13.9 天
- 7 日趨勢：穩定補充，每日 +70~100 新增

## PostHog 今日事件明細（3/29）
- card_opened × 4
- card_viewed × 3
- recommend_submitted × **2** ← 今日亮點
- feedback_given × 1（surprised）
- recommend_back_pressed × 1
- recommend_track_selected × 1
- profile_viewed × 1
- card_feedback_submitted × 1
- Total: 14 events, 1 active user

## Real User Streaks（P1 Bug）
| User ID | DB Streak | 預期 | 狀態 |
|---------|-----------|------|------|
| 87cd9416 | 2 (+1) | ≥12 | 🔴 P1 第 5 天 |
| 696dd7fb | 0 | ≥8 | 🔴 P1 第 5 天 |
| 0dd353a4 | onboarding=false | 應完成 | 🔴 DB 同步錯誤 |

## Issues
1. **Streak P1 仍未修復（第 5 天）**：streak_count 僅靠 seed script 設定，真實用戶完全不遞增。需 Bug Triage 優先處理。
2. **Open Rate 持續低迷**：3/28 = 0.8%，遠低於 60% 目標。推播通知到達率待查。
3. **DAU 定義需更新**：login_success 因 session 持續不會重複觸發，不反映真實活躍度。建議改為「任一 {card_opened, feedback_given, recommend_submitted, login_success}」的 OR 邏輯。
4. **0dd353a4 onboarding sync**：DB 顯示 onboarding_completed=false，但 PostHog 有多次 onboarding_completed 事件（自 3/24 起）。

## Recommended Actions
1. **[Bug Triage] Streak P1**：已持續 5 天，需本週修復。`openCard()` → `/api/roulette/:cardId/open` → streak increment logic 待查。
2. **[Analytics] DAU 定義更新**：向 Calvin 提議將 DAU 改為 OR 邏輯（login_success OR card_opened OR feedback_given OR recommend_submitted）。
3. **[DevOps] 推播通知診斷**：Open Rate 0.8% 可能代表 Expo Push 未送達，或用戶未授權通知。建議 DevOps 查 Expo Push 收據。
4. **[Bug Triage] 0dd353a4 onboarding sync**：DB 與 PostHog 不一致，需補 `PATCH /profiles` 或觸發 onboarding complete 流程。

## Next Actions
- Bug Triage 處理 Streak P1（第 5 天）
- CEO 報告：今日亮點為 recommend_submitted×2（真實用戶主動回推）
- 明日監控：cron 完成後確認 open rate 是否回升
