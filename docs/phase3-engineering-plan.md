# Phase 3 Engineering Plan — Aha Moment Enhancement

## Overview

3 changes, 12 files modified, 2 new files, 1 DB migration. Estimated 2.5 weeks.

---

## Change 1: Progressive Reveal + Adventure Level (Week 1)

### Step 1.1: DB Migration — `recommender_taste_label`

**File**: `supabase/migrations/005_recommender_taste_label.sql` (NEW)

```sql
ALTER TABLE roulette_cards ADD COLUMN recommender_taste_label TEXT;
```

Run via Supabase Dashboard SQL Editor.

---

### Step 1.2: Adventure Level Utility (Frontend)

**File**: `apps/mobile/utils/adventureLevel.ts` (NEW)

```typescript
export interface AdventureLevel {
  key: 'comfort' | 'small' | 'unknown' | 'bold' | 'extreme';
  label: string;
  emoji: string;
  color: string;
  description: string;
}

const LEVELS: AdventureLevel[] = [
  { key: 'comfort',  label: '舒適圈',   emoji: '🟢', color: '#2ECC71', description: '跟你的品味很接近' },
  { key: 'small',    label: '小冒險',   emoji: '🔵', color: '#3498DB', description: '稍微跳脫了一點' },
  { key: 'unknown',  label: '未知領域', emoji: '🟣', color: '#6C5CE7', description: '你很少接觸的領域' },
  { key: 'bold',     label: '大膽探索', emoji: '🟠', color: '#E67E22', description: '離你的舒適圈很遠' },
  { key: 'extreme',  label: '極限挑戰', emoji: '🔴', color: '#E74C3C', description: '完全不同的品味世界' },
];

export function getAdventureLevel(distance: number): AdventureLevel {
  if (distance <= 0.2) return LEVELS[0];
  if (distance <= 0.4) return LEVELS[1];
  if (distance <= 0.6) return LEVELS[2];
  if (distance <= 0.8) return LEVELS[3];
  return LEVELS[4];
}
```

---

### Step 1.3: Matching Service — Add Taste Label

**File**: `apps/api/src/services/matching.ts`

**Change**: In `runDailyMatching()`, when inserting `roulette_cards`, compute and store `recommender_taste_label`.

**Current** (line 199-208):
```typescript
const { error: cardError } = await supabaseAdmin
  .from('roulette_cards')
  .insert({
    recipient_id: user.id,
    recommender_id: best.rec.user_id,
    track_id: best.rec.track_id,
    reason: best.rec.reason,
    taste_distance: best.dist,
    status: 'pending',
  });
```

**New**:
```typescript
// Import { getTasteLabel } from '../utils/genres' (already exists!)
const recommenderVector = userVectorMap[best.rec.user_id] || [];
const tasteLabel = getTasteLabel(recommenderVector);

const { error: cardError } = await supabaseAdmin
  .from('roulette_cards')
  .insert({
    recipient_id: user.id,
    recommender_id: best.rec.user_id,
    track_id: best.rec.track_id,
    reason: best.rec.reason,
    taste_distance: best.dist,
    recommender_taste_label: tasteLabel,
    status: 'pending',
  });
```

**Also**: For curator fallback (line 231-240), set label to `'Curator 策展人'`.

---

### Step 1.4: Roulette API — Return Taste Label

**File**: `apps/api/src/routes/roulette.ts`

**Change**: `GET /today` select clause (line 17-19) add `recommender_taste_label`:

**Current**:
```typescript
.select(`
  id, reason, taste_distance, status, delivered_at, opened_at,
  tracks:track_id (spotify_id, title, artist, album, cover_url, spotify_url, genres)
`)
```

**New**:
```typescript
.select(`
  id, reason, taste_distance, recommender_taste_label, status, delivered_at, opened_at,
  tracks:track_id (spotify_id, title, artist, album, cover_url, spotify_url, genres)
`)
```

**Response** (line 54-62) add field:
```typescript
res.json({
  card: {
    id: card.id,
    track: card.tracks,
    reason: card.reason,
    taste_distance: card.taste_distance,
    recommender_taste_label: card.recommender_taste_label,  // NEW
    status: card.status,
  },
});
```

---

### Step 1.5: Shared Types — Add Fields

**File**: `packages/shared/types/index.ts`

**Change**: Add to `RouletteCard` interface (after line 33):
```typescript
recommenderTasteLabel: string | null;  // e.g. "爵士迷"
```

---

### Step 1.6: RouletteCard Component — Progressive Reveal (CORE CHANGE)

**File**: `apps/mobile/components/RouletteCard.tsx` (FULL REWRITE)

**Architecture**:
- Replace single `flipProgress` animation with `revealStep` state machine (0-4)
- Use `useReducer` instead of multiple useState
- Each step has distinct UI and transition animation

**State Machine**:
```
Step 0: Card back (🎲 Taste Roulette) — auto-flips after mount
Step 1: Recommender identity + adventure level
        "一位 [爵士迷] 推薦了你一首歌" + adventure badge
        [CTA: 點擊揭示]
Step 2: Album cover + track name (fade-in animation)
        [CTA: 點擊聆聽]
Step 3: Reason + Spotify player (slide-up animation)
        [播放器自動載入]
Step 4: Feedback button appears (after player loaded)
        [給個回饋 button]
```

**Key Implementation Notes**:
- Steps 1→2→3 each triggered by user tap (Pressable wrapping the card)
- Step 3→4 auto-triggered 3 seconds after Spotify embed loads (via onLoad callback)
- Each transition uses Reanimated `withTiming` or `withSpring`
- Back button / swipe down should NOT skip steps
- Adventure level badge uses `getAdventureLevel(card.tasteDistance)` for color + label

**Props change**:
```typescript
interface RouletteCardProps {
  card: (RouletteCardType & { track?: Track }) | null;
  onFeedback: () => void;
}
// No change needed — recommenderTasteLabel is inside card object
```

**Visual Design per Step**:

Step 1 (Identity):
```
┌──────────────────────┐
│                      │
│   一位               │
│   🟣 爵士迷          │  ← adventure level color
│   推薦了你一首歌     │
│                      │
│   品味距離 63%       │
│   🟣 未知領域        │  ← adventure badge
│                      │
│   [ 點擊揭示 → ]    │
└──────────────────────┘
```

Step 2 (Cover + Title):
```
┌──────────────────────┐
│ [Album cover fade-in]│
│                      │
│   Take Five          │
│   Dave Brubeck       │
│                      │
│   [ 點擊聆聽 → ]    │
└──────────────────────┘
```

Step 3 (Reason + Player):
```
┌──────────────────────┐
│ [Album cover]        │
│   Take Five          │
│   Dave Brubeck       │
│                      │
│   「第一次聽就會被   │
│    那個節拍抓住」    │
│                      │
│   [Spotify Player]   │
└──────────────────────┘
```

Step 4 (Feedback):
```
┌──────────────────────┐
│ [Album cover]        │
│   Take Five          │
│   Dave Brubeck       │
│   「推薦理由」       │
│   [Spotify Player]   │
│                      │
│   [給個回饋]         │  ← fade-in
└──────────────────────┘
```

---

### Step 1.7: Home Screen — Adapt to New Card

**File**: `apps/mobile/app/(tabs)/home.tsx`

**Change**: Minimal. The `RouletteCard` component handles everything internally. Only need to update header subtitle based on card state:

```typescript
// Line 121-122
<Text style={styles.headerSubtitle}>
  {todayCard
    ? '有人為你推薦了一首歌'    // Keep existing
    : '今天沒有新推薦'}
</Text>
```

No structural change needed — the card component manages its own reveal state.

---

## Change 2: Micro-Insight (Week 2)

### Step 2.1: Taste Vector Update from Feedback (Backend)

**File**: `apps/api/src/services/matching.ts`

**New function** — add after `computeTasteVector()`:

```typescript
const FEEDBACK_LEARNING_RATE = 0.1;
const FEEDBACK_WEIGHTS: Record<string, number> = {
  surprised: 1.0,
  okay: 0.2,
  not_for_me: -0.3,
};

/**
 * Incrementally update taste vector based on feedback.
 * Returns { oldVector, newVector, delta, dominantShift }.
 */
export async function updateTasteVectorFromFeedback(
  userId: string,
  trackId: string,
  reaction: string
): Promise<{
  oldVector: number[];
  newVector: number[];
  delta: number[];
  dominantShift: { genre: string; change: number } | null;
  genresExplored: number;
}> {
  // 1. Get current vector
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('taste_vector')
    .eq('id', userId)
    .single();

  const oldVector = profile?.taste_vector || new Array(VECTOR_DIM).fill(0);

  // 2. Get track genres
  const { data: track } = await supabaseAdmin
    .from('tracks')
    .select('genres')
    .eq('spotify_id', trackId)
    .single();

  const genres = track?.genres || [];
  if (genres.length === 0) {
    return {
      oldVector,
      newVector: oldVector,
      delta: new Array(VECTOR_DIM).fill(0),
      dominantShift: null,
      genresExplored: 0,
    };
  }

  // 3. Compute delta
  const genreVec = genreToVector(genres);
  const weight = FEEDBACK_WEIGHTS[reaction] ?? 0;
  const delta = genreVec.map(v => v * weight * FEEDBACK_LEARNING_RATE);

  // 4. Apply delta
  const newVector = oldVector.map((v, i) => v + delta[i]);

  // 5. Save updated vector
  await supabaseAdmin
    .from('profiles')
    .update({ taste_vector: newVector })
    .eq('id', userId);

  // 6. Find dominant shift (largest absolute delta)
  let maxIdx = 0;
  let maxAbs = 0;
  for (let i = 0; i < delta.length; i++) {
    if (Math.abs(delta[i]) > maxAbs) {
      maxAbs = Math.abs(delta[i]);
      maxIdx = i;
    }
  }

  const dominantShift = maxAbs > 0
    ? { genre: GENRES[maxIdx], change: delta[maxIdx] }
    : null;

  // 7. Count genres explored (from all received cards)
  const { data: receivedTracks } = await supabaseAdmin
    .from('roulette_cards')
    .select('tracks:track_id(genres)')
    .eq('recipient_id', userId);

  const genreSet = new Set<string>();
  if (receivedTracks) {
    for (const row of receivedTracks) {
      const t = row.tracks as any;
      if (t?.genres) t.genres.forEach((g: string) => genreSet.add(g));
    }
  }

  return { oldVector, newVector, delta, dominantShift, genresExplored: genreSet.size };
}
```

---

### Step 2.2: Feedback Endpoint — Return Insight Data

**File**: `apps/api/src/routes/roulette.ts`

**Change**: `POST /:cardId/feedback` (line 88-132)

After inserting feedback and updating card status, call `updateTasteVectorFromFeedback` and return insight:

```typescript
// After line 126 (after card status update), before res.json:

// Fetch the card to get track_id
const { data: cardData } = await supabaseAdmin
  .from('roulette_cards')
  .select('track_id, recommender_id, taste_distance')
  .eq('id', cardId)
  .single();

// Compute taste vector update
const insight = await updateTasteVectorFromFeedback(
  userId,
  cardData?.track_id || '',
  reaction
);

// Import { getTasteLabel, TASTE_LABELS } from '../utils/genres'
const dominantGenreLabel = insight.dominantShift
  ? (TASTE_LABELS[insight.dominantShift.genre] || insight.dominantShift.genre)
  : null;

res.json({
  ok: true,
  card_id: cardId,
  insight: {
    old_vector: insight.oldVector,
    new_vector: insight.newVector,
    dominant_shift: insight.dominantShift
      ? { genre: insight.dominantShift.genre, label: dominantGenreLabel, change: +(insight.dominantShift.change.toFixed(3)) }
      : null,
    genres_explored: insight.genresExplored,
  },
});
```

---

### Step 2.3: Frontend API Service — Handle Insight Response

**File**: `apps/mobile/services/api.ts`

**Change**: `submitFeedback()` return type — currently returns void, change to return insight data:

```typescript
export interface FeedbackInsight {
  oldVector: number[];
  newVector: number[];
  dominantShift: { genre: string; label: string; change: number } | null;
  genresExplored: number;
}

export async function submitFeedback(
  cardId: string,
  userId: string,
  reaction: string,
  comment?: string
): Promise<FeedbackInsight | null> {
  // ... existing fetch logic ...
  const json = await res.json();
  if (json.insight) {
    return {
      oldVector: json.insight.old_vector,
      newVector: json.insight.new_vector,
      dominantShift: json.insight.dominant_shift,
      genresExplored: json.insight.genres_explored,
    };
  }
  return null;
}
```

---

### Step 2.4: FeedbackSheet — Micro-Insight UI

**File**: `apps/mobile/components/FeedbackSheet.tsx`

**Change**: Replace static submitted state (lines 92-127) with dynamic micro-insight display.

**New Props**:
```typescript
interface FeedbackSheetProps {
  visible: boolean;
  cardId: string;
  tasteDistance: number;
  onSubmit: (reaction: FeedbackReaction, comment?: string) => Promise<FeedbackInsight | null>;  // Changed return type
  onClose: () => void;
  onSharePress?: () => void;
}
```

**New State**:
```typescript
const [insight, setInsight] = useState<FeedbackInsight | null>(null);
```

**Submitted State UI (replaces lines 92-127)**:

```
Normal:
┌────────────────────────────────┐
│ 你的品味地圖剛剛擴展了！       │
│                                │
│ [Mini TasteRadar before/after] │  ← 120px radar with morph
│                                │
│ Jazz +0.3 ↑                    │  ← dominantShift
│                                │
│ 已探索 8 個品味區域            │  ← genresExplored
│                                │
│ [分享到社群]                   │
│ [完成]                         │
└────────────────────────────────┘

If reaction == 'surprised':
┌────────────────────────────────┐
│ 🎉 新領域解鎖！               │
│                                │
│ 你在 Jazz 區域踏出了第一步    │
│                                │
│ [Mini TasteRadar before/after] │
│                                │
│ [分享到社群]                   │
│ [完成]                         │
└────────────────────────────────┘
```

---

### Step 2.5: TasteRadar — Mini Mode + Before/After

**File**: `apps/mobile/components/TasteRadar.tsx`

**New Props**:
```typescript
interface TasteRadarProps {
  tasteVector: number[];
  size?: number;
  mini?: boolean;           // NEW: compact mode (120px, no labels)
  beforeVector?: number[];  // NEW: previous vector for comparison overlay
}
```

**Changes**:
- When `mini=true`: size defaults to 120, hide text labels, thin lines
- When `beforeVector` provided: render second polygon in gray (#8E8E93, opacity 0.2) underneath the current one
- Animate the current polygon from beforeVector shape to tasteVector shape using Reanimated shared values

---

### Step 2.6: Home Screen — Pass Insight Through

**File**: `apps/mobile/app/(tabs)/home.tsx`

**Change**: `handleFeedbackSubmit` needs to capture and pass insight data to FeedbackSheet.

```typescript
const [feedbackInsight, setFeedbackInsight] = useState<FeedbackInsight | null>(null);

const handleFeedbackSubmit = useCallback(
  async (reaction: FeedbackReaction, comment?: string) => {
    if (!todayCard || !userId) return;
    const insight = await submitFeedback(todayCard.id, userId, reaction, comment);
    setFeedbackInsight(insight);
    setFeedbackGiven(true);
    return insight;  // Pass through to FeedbackSheet
  },
  [todayCard, userId, setFeedbackGiven]
);
```

---

## Change 3: Reaction Echo (Week 3)

### Step 3.1: Echo Notification Service

**File**: `apps/api/src/services/notifications.ts`

**New function**:

```typescript
/**
 * Send echo notification to recommender when their song gets a 'surprised' reaction.
 */
export async function sendReactionEcho(
  recommenderId: string,
  trackTitle: string,
  recipientTasteLabel: string
): Promise<boolean> {
  // Get recommender's push token
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('push_token')
    .eq('id', recommenderId)
    .single();

  if (!profile?.push_token) return false;

  const messages: ExpoPushMessage[] = [{
    to: profile.push_token,
    title: '🎉 你的推薦讓人驚喜了！',
    body: `你推薦的「${trackTitle}」讓一位${recipientTasteLabel}感到驚喜！`,
    data: { type: 'reaction_echo' },
    sound: 'default',
    channelId: 'reaction-echo',
  }];

  const tickets = await sendPushNotifications(messages);
  return tickets.length > 0 && tickets[0].status === 'ok';
}
```

---

### Step 3.2: Trigger Echo on Surprised Feedback

**File**: `apps/api/src/routes/roulette.ts`

**Change**: In `POST /:cardId/feedback`, after computing insight, if reaction is 'surprised' and card has a recommender:

```typescript
// After insight computation, before res.json:

if (reaction === 'surprised' && cardData?.recommender_id) {
  // Get track title for notification
  const { data: track } = await supabaseAdmin
    .from('tracks')
    .select('title')
    .eq('spotify_id', cardData.track_id)
    .single();

  // Get recipient's taste label for the notification
  const { data: recipientProfile } = await supabaseAdmin
    .from('profiles')
    .select('taste_vector')
    .eq('id', userId)
    .single();

  const recipientLabel = recipientProfile?.taste_vector
    ? getTasteLabel(recipientProfile.taste_vector)
    : '音樂探索者';

  // Fire and forget — don't block the response
  sendReactionEcho(
    cardData.recommender_id,
    track?.title || '未知曲目',
    recipientLabel
  ).catch(err => console.warn('Echo notification failed:', err));
}
```

---

### Step 3.3: Profile Impact Stats (Backend)

**File**: `apps/api/src/routes/profile.ts`

**Change**: In `GET /me` endpoint, add impact stats:

```typescript
// After existing stats queries, add:

// Count how many times this user's recommendations got 'surprised' reactions
const { count: impactSurprised } = await supabaseAdmin
  .from('feedbacks')
  .select('id', { count: 'exact', head: true })
  .eq('reaction', 'surprised')
  .in(
    'card_id',
    supabaseAdmin
      .from('roulette_cards')
      .select('id')
      .eq('recommender_id', userId)
  );

// Note: Above subquery may need to be done as two queries if Supabase
// doesn't support nested .in() with subqueries. Alternative:
const { data: myCards } = await supabaseAdmin
  .from('roulette_cards')
  .select('id')
  .eq('recommender_id', userId);

const myCardIds = (myCards || []).map((c: any) => c.id);
let impactSurprised = 0;
if (myCardIds.length > 0) {
  const { count } = await supabaseAdmin
    .from('feedbacks')
    .select('id', { count: 'exact', head: true })
    .eq('reaction', 'surprised')
    .in('card_id', myCardIds);
  impactSurprised = count ?? 0;
}

// Add to response:
res.json({
  profile: {
    // ... existing fields ...
    stats: {
      // ... existing stats ...
      impact_surprised: impactSurprised,
    },
  },
});
```

---

### Step 3.4: Profile Screen — Impact Section

**File**: `apps/mobile/app/(tabs)/profile.tsx`

**Change**: Add "Your Impact" section after existing stats row.

```
┌──────────────────────────┐
│ 你的推薦影響力            │
├──────────────────────────┤
│ 🎉  3                    │
│ 讓人驚喜                  │
└──────────────────────────┘
```

Small addition — only show if user has submitted at least 1 recommendation.

---

## File Change Summary

| File | Action | Change |
|------|--------|--------|
| `supabase/migrations/005_recommender_taste_label.sql` | NEW | Add column |
| `apps/mobile/utils/adventureLevel.ts` | NEW | Adventure level utility |
| `packages/shared/types/index.ts` | EDIT | Add `recommenderTasteLabel` to RouletteCard |
| `apps/api/src/services/matching.ts` | EDIT | Add taste label to card insert + `updateTasteVectorFromFeedback()` |
| `apps/api/src/routes/roulette.ts` | EDIT | Return taste label + insight data + trigger echo |
| `apps/api/src/services/notifications.ts` | EDIT | Add `sendReactionEcho()` |
| `apps/api/src/routes/profile.ts` | EDIT | Add impact stats |
| `apps/mobile/components/RouletteCard.tsx` | REWRITE | 4-step progressive reveal |
| `apps/mobile/components/FeedbackSheet.tsx` | EDIT | Micro-insight UI |
| `apps/mobile/components/TasteRadar.tsx` | EDIT | Mini mode + before/after |
| `apps/mobile/services/api.ts` | EDIT | Return insight from submitFeedback |
| `apps/mobile/app/(tabs)/home.tsx` | EDIT | Pass insight through |
| `apps/mobile/app/(tabs)/profile.tsx` | EDIT | Impact section |

## Dependencies

```
Change 1 (Reveal):
  005_migration → matching.ts (label) → roulette.ts (return) → types → RouletteCard.tsx
  adventureLevel.ts → RouletteCard.tsx

Change 2 (Insight):
  matching.ts (updateVector) → roulette.ts (return insight) → api.ts (parse) → FeedbackSheet.tsx
  TasteRadar.tsx (mini+before) → FeedbackSheet.tsx

Change 3 (Echo):
  notifications.ts (sendEcho) → roulette.ts (trigger) → profile.ts (stats) → profile.tsx (UI)
```

## Risk Mitigations

1. **RouletteCard rewrite is the biggest risk** — keep existing component as `RouletteCardLegacy.tsx` backup
2. **Taste vector update race condition** — use Supabase's atomic update, not read-modify-write
3. **Echo notification spam** — only trigger on 'surprised', max 1 per card (enforced by unique feedback per card)
4. **Empty taste label for old cards** — handle `null` gracefully in frontend (show '某位音樂愛好者')
