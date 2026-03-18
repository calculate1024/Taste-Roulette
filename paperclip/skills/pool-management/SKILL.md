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
SELECT COUNT(*) as cards_today
FROM roulette_cards
WHERE created_at > now() - interval '24 hours';
```
Compare with pool size to estimate days until depletion.

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
