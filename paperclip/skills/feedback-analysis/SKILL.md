# Feedback Analysis Skill

## Purpose
Analyze user feedback from in-app reactions, comments, and app store reviews
to identify trends, pain points, and opportunities.

## Data Sources

### 1. In-App Feedback (Primary)
```sql
-- Reaction distribution (last 7 days)
SELECT reaction, COUNT(*) as count,
       ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as pct
FROM feedbacks
WHERE created_at > now() - interval '7 days'
GROUP BY reaction;

-- Comments with sentiment (last 7 days)
SELECT f.reaction, f.comment, t.title, t.artist, t.genres
FROM feedbacks f
JOIN roulette_cards rc ON rc.id = f.card_id
JOIN tracks t ON t.spotify_id = rc.track_id
WHERE f.comment IS NOT NULL
  AND f.created_at > now() - interval '7 days'
ORDER BY f.created_at DESC;
```

### 2. App Store Reviews (Secondary)
- Google Play: scrape via web search
- App Store: scrape via web search
- Look for reviews mentioning "taste roulette" or app name

### 3. Taste Distance vs Satisfaction
```sql
-- Are we hitting the sweet spot?
SELECT
  CASE
    WHEN rc.taste_distance < 0.3 THEN 'too_close'
    WHEN rc.taste_distance BETWEEN 0.3 AND 0.7 THEN 'sweet_spot'
    WHEN rc.taste_distance > 0.7 THEN 'too_far'
  END as distance_bucket,
  f.reaction,
  COUNT(*) as count
FROM feedbacks f
JOIN roulette_cards rc ON rc.id = f.card_id
WHERE rc.taste_distance IS NOT NULL
GROUP BY distance_bucket, f.reaction;
```

## Analysis Framework

### Categorize Feedback
1. **Discovery Quality** — "too similar", "too different", "perfect surprise"
2. **App Performance** — crashes, loading, audio playback
3. **UI/UX** — navigation, design, readability
4. **Feature Requests** — what users ask for
5. **Onboarding** — first impressions, confusion points
6. **Positive Testimonials** — for Social agent to highlight

### Trend Detection
- Flag any category with >= 3 mentions in 7 days as a "trend"
- Compare this week vs last week — is it getting better or worse?
- Track sentiment score: surprised=+2, okay=0, not_for_me=-1

### Sweet Spot Analysis
- Is the 0.3-0.7 taste distance range producing good surprise rates?
- Should we narrow or widen the range?
- Are certain genres more forgiving (wider sweet spot)?

## Output Format
```markdown
## Weekly Feedback Summary — {date_range}

### Reaction Distribution
- 🤯 Surprised: {n}% (target: 25%)
- 😐 Okay: {n}%
- 🙅 Not for me: {n}%

### Top Themes
1. {theme} — {n} mentions — {trend: up/down/stable}
2. ...

### Sweet Spot Performance
- Cards in sweet spot (0.3-0.7): {n}%
- Surprise rate within sweet spot: {n}%
- Surprise rate outside sweet spot: {n}%

### Notable Comments
- "{comment}" — {reaction} on {track} by {artist}
- ...

### Recommended Actions
- {actionable insights}
```
