# Calvin 指令 — 規則更新 (2026-04-01)

## 1. Curator 提交限制分級
curator.yaml 已更新。兩級制度：
- **系統 curator (is_seed=true)**：100/天，無月度上限
- **真實用戶 curator (is_seed=false)**：10/天，50/月（維持不變）
- Bot 偵測只套用於 is_seed=false 的 profile

## 2. "alternative" genre 假警報取消
Curator 確認：genres.ts 將 alternative/alt-rock 正規化為 "rock" 或 "indie"。
- "alternative: 0" 是追蹤假象，不是真正缺失
- 請從 genre gap alerts 中移除 "alternative"
- 實際覆蓋：rock 137+, indie 107+
