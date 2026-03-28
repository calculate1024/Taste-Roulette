# Content Moderation Skill

## Purpose
Review user-submitted recommendations for quality and appropriateness.

## Context
Users can submit track recommendations after giving feedback. These go into
`user_recommendations` table and are used by the matching engine. We need to
ensure quality and filter inappropriate content.

## Procedure

### 1. Fetch Pending Submissions
```sql
SELECT ur.id, ur.user_id, ur.track_id, ur.reason, ur.created_at,
       t.title, t.artist, t.genres
FROM user_recommendations ur
JOIN tracks t ON t.spotify_id = ur.track_id
WHERE ur.created_at > now() - interval '24 hours'
  AND ur.used = false
ORDER BY ur.created_at DESC;
```

### 2. Validate Each Submission

**Auto-approve if ALL:**
- Track exists in `tracks` table (valid Spotify ID)
- Reason is 2-100 characters
- Reason contains no URLs (regex: `https?://`)
- Track not a duplicate in pool (same track_id, used=false)
- User hasn't submitted same track before

**Auto-reject if ANY:**
- Reason contains promotional URLs
- Reason is empty or whitespace only
- Same user submitted 5+ tracks in 24 hours (spam pattern)
- Track spotify_id doesn't exist in Spotify API

**Escalate if:**
- Reason contains potentially offensive language
- User has 3+ previously rejected submissions
- Track is from an artist with known controversy

### 3. Process Results
```sql
-- For rejected: mark as used (removes from pool without delivering)
UPDATE user_recommendations SET used = true WHERE id = $1;

-- Log rejection reason for analytics
INSERT INTO moderation_log (recommendation_id, action, reason, created_at)
VALUES ($1, 'rejected', $2, now());
```

### 4. Report
```
Moderation Summary — {date}
- Reviewed: {n}
- Auto-approved: {n}
- Auto-rejected: {n} (reasons: {breakdown})
- Escalated: {n}
```

## 5. Curator Reason Integrity Check (DAILY)

Verify that CURATOR_REASONS entries in `apps/api/src/utils/curator-reasons.ts`
match the actual tracks in the database. This prevents mismatched reasons
(e.g., showing a K-Pop reason for an indie rock track).

### Procedure

```sql
-- Get all cards delivered today with curator fallback (recommender_id IS NULL)
-- and check if reason matches track genre/style
SELECT rc.id, rc.track_id, rc.reason, rc.recommender_taste_label,
       t.title, t.artist, t.genres
FROM roulette_cards rc
JOIN tracks t ON t.spotify_id = rc.track_id
WHERE rc.created_at > now() - interval '24 hours'
  AND rc.recommender_id IS NULL;
```

### Red Flags (report immediately)
- Reason mentions a genre not in the track's genres array (e.g., "K-Pop" reason on a rock track)
- Reason mentions a specific artist name that doesn't match the track's artist
- Reason mentions specific musical elements inconsistent with the genre (e.g., "guitar riff" for an electronic track)

### Fix Procedure
1. Note the track's spotify_id and the wrong reason
2. Check `CURATOR_REASONS` in `apps/api/src/utils/curator-reasons.ts`
3. If the spotify_id maps to a wrong reason → report to Calvin for code fix
4. Fix the delivered card's reason in DB:
```sql
UPDATE roulette_cards SET reason = '一位{正確label}覺得這首值得被更多人聽到'
WHERE id = '<card_id>';
```

### Batch Verification Query
```sql
-- Find potential mismatches: curator reasons that mention genres
-- not present in the track's genre tags
SELECT rc.id, t.title, t.artist, t.genres, rc.reason
FROM roulette_cards rc
JOIN tracks t ON t.spotify_id = rc.track_id
WHERE rc.recommender_id IS NULL
  AND rc.created_at > now() - interval '7 days'
  AND (
    (rc.reason ILIKE '%K-Pop%' AND NOT 'k-pop' = ANY(t.genres))
    OR (rc.reason ILIKE '%metal%' AND NOT 'metal' = ANY(t.genres))
    OR (rc.reason ILIKE '%jazz%' AND NOT 'jazz' = ANY(t.genres))
    OR (rc.reason ILIKE '%classical%' AND NOT 'classical' = ANY(t.genres))
    OR (rc.reason ILIKE '%reggae%' AND NOT 'reggae' = ANY(t.genres))
    OR (rc.reason ILIKE '%latin%' AND NOT 'latin' = ANY(t.genres))
  );
```

## Safety
- Never expose user identity in moderation reports
- Log all moderation decisions for audit trail
- If in doubt, escalate rather than auto-reject
