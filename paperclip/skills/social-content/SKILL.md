# Social Content Skill

## Purpose
Generate social media content drafts for Taste Roulette's brand channels.

## Context
Taste Roulette's social presence aims to build community around music discovery.
All posts require Calvin's approval before publishing. Content should be in
Traditional Chinese (繁體中文) with occasional English for music terms.

## Content Pillars

### 1. Discovery Stories (3x/week)
Anonymized stories about users discovering unexpected music.
```
Template:
「一位 {taste_label} 今天收到了一首 {genre} 的推薦，
結果反應是：🤯

品味距離 {distance}%，但驚喜感 100%。」

#TasteRoulette #每日驚喜
```

### 2. Genre Spotlight (1x/week)
Deep dive into an interesting genre or cross-genre discovery.
```
Template:
「你知道嗎？{genre_a} 和 {genre_b} 的聽眾其實有 {correlation}% 的重疊。

這週最多驚喜的配對：{genre_a} 迷 → {genre_b} 推薦 🎲」
```

### 3. Streak Celebrations (as needed)
Celebrate user milestone streaks (anonymized).
```
Template:
「有人已經連續 {n} 天打開每日驚喜了 🔥
到底是什麼讓人停不下來？」
```

### 4. Music Trivia (2x/week)
Fun facts tied to genres in the app.

## Data Sources
Query Supabase for interesting stats:
```sql
-- Most surprising genre pairing this week
SELECT t_src.genres as recommender_genres, t_dest.genres as recipient_genres,
       COUNT(*) FILTER (WHERE f.reaction = 'surprised') as surprises
FROM feedbacks f
JOIN roulette_cards rc ON rc.id = f.card_id
JOIN tracks t_src ON t_src.spotify_id = rc.track_id
JOIN profiles p ON p.id = rc.recipient_id
-- ... group by genre pairs, order by surprise rate
```

## Output Format
Each draft includes:
1. Post text (Traditional Chinese, < 280 chars for Twitter, < 2200 for IG)
2. Suggested image description (for image generation or stock photo search)
3. Hashtags
4. Suggested posting time
5. Platform (IG / Twitter / both)

## Brand Guidelines
- Tone: Curious, warm, slightly playful — like a friend who knows great music
- Never reveal user identities or specific data
- Avoid: corporate speak, algorithm jargon, competitor mentions
- Use music emoji sparingly: 🎲 🎵 🔥 🤯
