# Taste Roulette — 14 週 MVP 開發計畫

## 時程總覽

| Phase | 週次 | 主題 | 交付物 |
|-------|------|------|--------|
| Phase 0 | Wk 1-3 | Foundation | 可登入、可 swipe onboarding、metadata pipeline |
| Phase 1 | Wk 4-7 | Core Loop | 每日推薦卡片 → 回饋 → 回推 → 配對引擎 |
| Phase 2 | Wk 8-10 | Stickiness | 品味地圖、Streak、Spotify 匯入 |
| Phase 3 | Wk 11-14 | Growth | 社群分享、Taste Twin、Premium、Curator |
| Go/No-Go | Wk 10 | 決策點 | 根據 KPI 決定是否投入 Phase 3 |

## Phase 0: Foundation (Week 1-3)

### Week 1: 專案初始化 + Auth
- [ ] Expo 專案初始化 (TypeScript template)
- [ ] Supabase 專案建立、Schema migration
- [ ] Auth 流程：Email + Apple Sign-In + Google Sign-In
- [ ] 基本導航結構 (Expo Router: onboarding → home → profile)
- [ ] Node.js API 骨架 + Supabase client 連接

### Week 2: Onboarding 體驗
- [ ] 精選 100+ 種子曲目（涵蓋 15+ 類型）
- [ ] Spotify API service: 取得 track metadata + audio features
- [ ] Swipe 問卷 UI (Gesture Handler + Reanimated)
- [ ] 問卷結果寫入 DB
- [ ] 完成 onboarding → 觸發品味向量計算

### Week 3: 推薦引擎基礎 + 推送
- [ ] Python FastAPI microservice 骨架
- [ ] taste_engine.py: compute_taste_vector() 實作
- [ ] taste_engine.py: taste_distance() + find_sweet_spot_match()
- [ ] Expo Push Notification 設定
- [ ] Daily cron job 骨架 (先用固定時間觸發)

### Week 3 Checkpoint ✅
> 用戶可以註冊、完成品味問卷、品味向量被計算並儲存。
> Push notification 可以被接收。

---

## Phase 1: Core Loop (Week 4-7)

### Week 4: Daily Roulette Card
- [ ] 每日配對 cron job：從推薦池配對 + 產生 roulette_cards
- [ ] Roulette Card UI：翻牌動畫 + 封面 + 曲名 + 理由
- [ ] Spotify 30 秒預覽播放整合
- [ ] 品味標籤生成（從 genres + audio features 轉成可讀標籤）
- [ ] 空狀態處理（無推薦可用時顯示 Curator 內容）

### Week 5: Feedback + Recommend-Back
- [ ] 三段式回饋 UI (surprised / okay / not_for_me)
- [ ] 可選短評輸入
- [ ] Recommend-Back 流程：Spotify 搜尋 → 選曲 → 寫理由 → 提交
- [ ] 回饋數據寫入 DB + 更新卡片狀態

### Week 6: 配對引擎完善
- [ ] 品味距離甜蜜點動態調整（根據回饋數據微調 min/max distance）
- [ ] 回推率監控：收到 3 次未回推 → 暫停接收機制
- [ ] Curator fallback：手動匯入 5-10 位 Curator 的推薦
- [ ] Edge cases: 新用戶無歷史、推薦池枯竭、自己推薦自己

### Week 7: 整合測試 + 打磨
- [ ] 完整 core loop 端對端測試
- [ ] Loading / Error / Empty states 處理
- [ ] 推送通知文案優化
- [ ] 效能優化（圖片快取、API response time）
- [ ] 內部 dogfooding 測試（邀請 10-20 人試用）

### Week 7 Checkpoint ✅
> 完整核心飛輪：每日收到推薦 → 預覽音樂 → 給回饋 → 推薦一首歌給別人。
> 配對引擎在品味甜蜜點範圍內運作。

---

## Phase 2: Stickiness (Week 8-10)

### Week 8: Taste Journey + Streak
- [ ] Taste Journey 頁面：雷達圖 (react-native-svg)
- [ ] 品味演變時間軸
- [ ] Streak 計數 + 火焰圖示
- [ ] Badge 系統 (5 種初始徽章)
- [ ] Profile 頁重新設計

### Week 9: Spotify 匯入 + 向量升級
- [ ] Spotify OAuth 串接
- [ ] 匯入 Top Tracks / Top Artists / Recently Played
- [ ] 品味向量 v2：融合 onboarding + Spotify 歷史 + 回饋數據
- [ ] 配對品質提升驗證

### Week 10: 數據分析 + Go/No-Go 準備
- [ ] PostHog 事件追蹤完整接入
- [ ] Dashboard: D7 retention, roulette open rate, recommend-back rate, surprise score
- [ ] Weekly Taste Report (推送 or in-app)
- [ ] Bug fixes + 穩定性

### Week 10 Go/No-Go 決策 🚦

> **Side project 定位調整**：不以硬性用戶數為門檻，改以學習成果和產品完整度為主要指標。

| 指標 | 目標 | 性質 |
|------|------|------|
| Core loop 完整度 | 推薦→回饋→回推全流程可運作 | 必須達到 |
| D7 Retention | ≥ 20% (若有足夠用戶數據) | 參考 |
| Recommend-Back Rate | ≥ 15% | 參考 |
| Daily Open Rate | ≥ 30% | 參考 |
| Surprise Score | ≥ 15% | 參考 |

> 主要決策依據：核心飛輪是否運轉順暢、自己和測試用戶的體驗是否有驚喜感。
> 若核心體驗成立，進入 Phase 3；否則檢討演算法或 UX。

---

## Phase 3: Growth (Week 11-14)

### Week 11: 社群分享
- [ ] 分享圖卡生成 (react-native-view-shot)
- [ ] IG Stories / Twitter 分享
- [ ] Deep link 設定 (Expo Linking)
- [ ] 邀請機制（分享送額外卡片）

### Week 12: Taste Twin
- [ ] 品味雙胞胎 / 互補配對 UI
- [ ] 匿名聊天 (Supabase Realtime)
- [ ] 每日訊息限制

### Week 13: Curator + Premium
- [ ] Curator 管理後台 (簡易 Web admin)
- [ ] RevenueCat 串接
- [ ] Premium 功能解鎖
- [ ] App Store / Google Play 上架準備

### Week 14: 上架 + Launch
- [ ] App Store Review 提交
- [ ] Google Play 提交
- [ ] Landing page
- [ ] Launch 社群宣傳素材
- [ ] → 轉入 Paperclip 經營模式

---

## 每日開發節奏建議

Calvin 使用 Claude Code 開發時的建議工作流程：

```
1. 開始前：確認今天要完成的 Task（從上方 checklist 選取）
2. 啟動 Claude Code：指向 CLAUDE.md 取得上下文
3. 開發：一次聚焦一個 Task，完成後 commit
4. 測試：在模擬器/真機上驗證
5. 結束前：更新 checklist、記錄遇到的問題
```

## 風險緩解

| 風險 | 預防措施 |
|------|----------|
| Spotify API 限制 | 積極快取、控制 API call 頻率、準備 MusicBrainz 作為備案 |
| 冷啟動無推薦 | Curator 策展機制 + 編輯精選作為 fallback |
| 低回推率 | 暫停機制 + nudge 文案 A/B 測試 |
| App 審核被拒 | 提前研究 Apple/Google 審核指南、避免踩紅線 |
| 推薦引擎效果差 | v1 用簡單 cosine distance，不過度工程化，快速迭代 |
