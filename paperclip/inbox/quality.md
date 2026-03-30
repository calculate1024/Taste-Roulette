# Calvin Correction — NPR Music Editors 非 Bot

b46309a2 (NPR Music Editors) 是合法的 seed curator (is_seed=true)，由 harvest agent 於 2026-03-26 建立。

- 74-84 筆提交是正常的批次匯入，**非真實用戶違規**
- 請移除此 profile 的所有 flag/凍結
- 未來 is_seed=true 的 profile 不應觸發 bot 偵測規則
- 調整規則：bot 偵測只套用於 is_seed=false 的用戶
