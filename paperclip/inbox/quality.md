# Quality Agent — Orphan Detection Fix (2026-03-27)

## 問題

之前的孤兒偵測邏輯有 pagination bug：Supabase REST API 預設只返回 1000 筆，當 tracks 表超過 1000 筆後，用 JS 比較兩個列表會產生大量假陽性（685 筆"孤兒"實際只有 6 筆）。

## 修正

**立即生效**：`paperclip/skills/pool-management/SKILL.md` 已更新，新增了正確的 orphan detection SQL。

**你的 orphan 偵測必須改用 SQL JOIN**，不得再用 JS 分別 fetch 兩張表比較：

```sql
SELECT COUNT(*) as orphan_count
FROM user_recommendations ur
LEFT JOIN tracks t ON t.spotify_id = ur.track_id
WHERE ur.used = false
  AND t.spotify_id IS NULL;
```

如果你無法直接執行 SQL，改用 Supabase REST 的方式：對 `user_recommendations` 查詢時用 `select=track_id,tracks!inner(spotify_id)` 做 inner join，然後比較 count 差異。

## 當前狀態

- 實際孤兒：**0 筆**（已修復）
- 有效 pool：**1,621 筆（14.6 天供應）**
- curator-inserter.ts 已修補：insert recommendation 前會確認 tracks 記錄存在

## 行動

1. 下次 heartbeat 使用新的 SQL 方式偵測 orphan
2. 如果 orphan > 0，用 `ensureTrackCached()` 補 metadata，404 的則清除
3. 不要再報告「685 orphans CRITICAL」— 那是分頁 bug 的假警報
