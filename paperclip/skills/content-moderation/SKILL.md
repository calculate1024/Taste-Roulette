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

## Safety
- Never expose user identity in moderation reports
- Log all moderation decisions for audit trail
- If in doubt, escalate rather than auto-reject
