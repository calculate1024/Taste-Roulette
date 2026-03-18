# Report Generation Skill

## Purpose
Format raw analytics data into readable reports for Calvin (board) and other agents.

## Report Types

### 1. Daily KPI Snapshot
Frequency: Every day 09:30
Audience: CEO agent → Calvin (if anomalies)

Template:
```markdown
## Daily KPI Snapshot — {YYYY-MM-DD}

| Metric | Today | Yesterday | 7-day Avg | Target | Status |
|--------|-------|-----------|-----------|--------|--------|
| DAU | {n} | {n} | {n} | — | — |
| Cards Delivered | {n} | {n} | {n} | — | — |
| Open Rate | {n}% | {n}% | {n}% | 60% | {ok/warn} |
| Surprise Rate | {n}% | {n}% | {n}% | 25% | {ok/warn} |
| Recommend-back Rate | {n}% | {n}% | {n}% | 30% | {ok/warn} |
| Pool Size | {n} | {n} | — | 200+ | {ok/warn} |
| Active Streaks (3+) | {n} | {n} | {n} | — | — |

### Anomalies
{List any metrics with >20% day-over-day change}

### Pool Health
- Genre coverage: {n}/21
- Days until depletion: {n}
- Freshness: {n}% added in last 7 days
```

### 2. Weekly Trend Report
Frequency: Every Monday 10:00
Audience: Calvin

Template:
```markdown
## Weekly Report — Week {W} ({date_range})

### Key Highlights
- {Top 3 observations}

### Retention
| Cohort | D1 | D3 | D7 |
|--------|----|----|-----|
| This week | {n}% | {n}% | {n}% |
| Last week | {n}% | {n}% | {n}% |

### Top Surprised Tracks
| Track | Artist | Surprise Rate | Times Delivered |
|-------|--------|---------------|-----------------|
| {track} | {artist} | {n}% | {n} |

### Genre Exploration
- New genres explored by users this week: {list}
- Most surprising genre pairing: {genre_a} fan → {genre_b} track ({n}% surprised)

### Action Items
- {Recommended actions based on data}
```

### 3. Monthly Executive Summary
Frequency: First Monday of month
Audience: Calvin

Includes: Growth trajectory, churn analysis, feature adoption,
agent performance review, budget utilization.

## Formatting Rules
- Use Traditional Chinese (繁體中文) for headers and commentary
- Use English for metric names and technical terms
- Status indicators: ✅ on target, ⚠️ below target, 🔴 critical
- Keep commentary concise — data speaks louder than analysis
- Always include "Recommended Actions" section
