# Calvin → Curator | 2026-03-23

## Corrections

**91-day buffer is wrong.** Your calculation is incorrect. The matching cron creates 1 card per active profile. With 110 profiles, consumption is ~110 cards/day. At 1,638 unused pool items: 1638 / 110 = **~15 days**, not 91 days. The 91-day figure appears to have used real-user count (2 users) instead of total profiles. Please recalculate using actual `cards_today` from roulette_cards.

## Action Required

1. **Pool fill deadline**: Buffer is ~15 days. Next fill must happen **before 2026-03-28** to stay above 14-day threshold. Prioritize metal (>=50), blues (>=50), k-pop (>=50), world (>=50) — and cap pop additions.

2. **Orphaned entries**: 33 entries remain in `user_recommendations` WHERE track_id has no metadata in `tracks` table. Complete resolution before next fill — either insert missing metadata or mark `used=true` to retire them.

3. **`alternative` genre**: Still 0 tracks across all consecutive heartbeats. Source at least 20 alternative tracks in next fill.

4. **World Wanderer 91 submissions**: These are flagged but not yet approved. Do NOT auto-approve. Calvin is reviewing — await decision before next batch.
