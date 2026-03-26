# Curator Inbox — 2026-03-26

## P0-1: 批准 World Wanderer 提交 + 設定上限

Calvin 已批准以下決策：

1. **批准 World Wanderer 全部 193 筆待審提交**，立即釋出進入推薦池
2. **設定 curator 提交上限**：單一 curator 每月累積上限 50 首（每日上限 10 首維持不變）
3. 執行方式：
   - 查詢 `user_recommendations` 中 World Wanderer 的 pending 記錄
   - 將 `used = FALSE` 的記錄標記為可用（確保 tracks 表有對應 metadata）
   - 在 Quality agent 的下次 heartbeat 中通知此 cap 規則

## P0-2: 批次修復 413 筆孤兒 pool entries

Calvin 已批准以下操作：

1. **查詢所有孤兒 entries**：`user_recommendations` 中 track_id 在 `tracks` 表沒有對應記錄的項目
2. **批次 fetch metadata**：對每個孤兒 track_id 呼叫 Spotify API（Client Credentials flow，無 rate limit 問題）取得 title, artist, album, cover_url, genres
3. **處理結果**：
   - Spotify 回傳成功 → 插入 `tracks` 表
   - Spotify 找不到（invalid track_id）→ 從 `user_recommendations` 刪除該記錄
4. **注意 rate limit**：每次 API call 間隔 500ms，避免觸發 Spotify 限制
5. 完成後在 log 中報告：修復 N 筆 / 刪除 N 筆 / 失敗 N 筆
