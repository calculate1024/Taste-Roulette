# Pool Management Skill

## Purpose
Monitor and maintain the health of the recommendation pool — the set of unused
tracks available for daily matching.

## Context
The matching engine draws from `user_recommendations WHERE used = false`. If the pool
is too small, matching fails. If genre distribution is skewed, users in minority
genres get poor recommendations.

## Key Metrics

### Pool Size
```sql
SELECT COUNT(*) as unused_pool_size
FROM user_recommendations
WHERE used = false;
```
Target: >= 200. Alert at < 100. Critical at < 50.

### Genre Distribution
```sql
SELECT g.genre, COUNT(*) as count
FROM user_recommendations ur
JOIN tracks t ON t.spotify_id = ur.track_id
CROSS JOIN LATERAL unnest(t.genres) AS g(genre)
WHERE ur.used = false
GROUP BY g.genre
ORDER BY count ASC;
```
Target: all 21 genres represented. Alert if any genre has 0 tracks.

### Freshness
```sql
SELECT
  COUNT(*) FILTER (WHERE ur.created_at > now() - interval '7 days') as fresh,
  COUNT(*) as total
FROM user_recommendations ur
WHERE ur.used = false;
```
Target: >= 30% fresh (added in last 7 days).

### Consumption Rate
```sql
-- IMPORTANT: Vercel cron runs at UTC 13:00. Agents run at UTC 23:00.
-- Always check YESTERDAY's card delivery, not today's.
-- "0 cards today" before UTC 13:00 is NORMAL, not a cron failure.
SELECT COUNT(*) as cards_yesterday
FROM roulette_cards
WHERE created_at >= (CURRENT_DATE - interval '1 day')
  AND created_at < CURRENT_DATE;
```
Compare with pool size to estimate days until depletion.
To confirm cron health, check if yesterday had ~110 cards. Do NOT report
"cron failure" based on today's count before UTC 13:00.

## Procedures

### Daily Health Check
1. Query all metrics above
2. Calculate days-until-depletion = pool_size / avg_daily_consumption
3. If < 7 days → trigger Curator Agent immediate run
4. If any genre has 0 tracks → flag for Curator priority

### Pool Rebalancing
When top genre has > 3x tracks of bottom genre:
1. Identify overrepresented genres
2. Mark oldest overrepresented tracks as `used = true` (artificial consumption)
3. Request Curator to fill underrepresented genres

### Orphan Detection
**IMPORTANT**: Use SQL JOIN — do NOT fetch two lists and compare in JS.
Supabase REST API caps at 1000 rows per request, causing false positives.

```sql
-- Count orphans: recommendations without matching track metadata
SELECT COUNT(*) as orphan_count
FROM user_recommendations ur
LEFT JOIN tracks t ON t.spotify_id = ur.track_id
WHERE ur.used = false
  AND t.spotify_id IS NULL;
```

To list orphan track_ids for remediation:
```sql
SELECT DISTINCT ur.track_id
FROM user_recommendations ur
LEFT JOIN tracks t ON t.spotify_id = ur.track_id
WHERE ur.used = false
  AND t.spotify_id IS NULL
LIMIT 100;
```

Target: 0 orphans. Alert at > 10. Critical at > 50.
Action: run `ensureTrackCached()` for each orphan, remove if Spotify 404.

**NEVER** detect orphans by fetching `user_recommendations` and `tracks` separately
and comparing in-memory — this WILL break when either table exceeds 1000 rows.

### Dedup Check
```sql
SELECT track_id, COUNT(*) as dupes
FROM user_recommendations
WHERE used = false
GROUP BY track_id
HAVING COUNT(*) > 1;
```
Remove duplicate entries (keep newest).

## Reporting
Daily output to CEO agent:
```
Pool Status: {size} tracks ({days_left} days supply)
Genre Coverage: {covered}/21 genres
Freshness: {pct}% added in last 7 days
Action Needed: {yes/no} — {reason}
```
