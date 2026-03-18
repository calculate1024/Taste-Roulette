# Phase 3B 工程計畫 — Aha Moment 強化

## 三項增強功能詳細實作規格

---

## A. Yesterday's Echo — 昨日回響

### 概念
用戶打開 Home 頁時，如果昨天的推薦收到了「驚喜」回饋，先顯示一個短暫的結果回顧卡片，製造「你的推薦產生了影響」的成就感。

### 資料流
```
用戶打開 Home → 呼叫 GET /api/roulette/yesterday-echo
→ 後端查昨天該用戶推薦出去的卡片中，有沒有收到 'surprised' feedback
→ 有 → 回傳 track title + recipient taste label
→ 前端顯示 3 秒 toast → 自動淡出
```

### 後端變更

**檔案：`apps/api/src/routes/roulette.ts`**

新增 endpoint（加在現有 routes 後面）：

```typescript
// GET /api/roulette/yesterday-echo — check if user's recommendation got surprised feedback yesterday
router.get('/yesterday-echo', async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Calculate yesterday's time range (UTC+8)
  const todayStart = getTodayStartUTC8();
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  // Find cards from this user's recommendations that got 'surprised' feedback yesterday
  const { data: echoCards } = await supabaseAdmin
    .from('roulette_cards')
    .select(`
      id, track_id,
      tracks:track_id (title, artist, cover_url),
      feedbacks!inner (reaction, created_at)
    `)
    .eq('recommender_id', userId)
    .eq('feedbacks.reaction', 'surprised')
    .gte('feedbacks.created_at', yesterdayStart.toISOString())
    .lt('feedbacks.created_at', todayStart.toISOString())
    .limit(1)
    .maybeSingle();

  if (!echoCards) {
    res.json({ echo: null });
    return;
  }

  // Get recipient taste label
  const { data: recipientCard } = await supabaseAdmin
    .from('roulette_cards')
    .select('recipient_id')
    .eq('id', echoCards.id)
    .single();

  let recipientLabel = '音樂探索者';
  if (recipientCard?.recipient_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('taste_vector')
      .eq('id', recipientCard.recipient_id)
      .single();
    if (profile?.taste_vector) {
      recipientLabel = getTasteLabel(profile.taste_vector);
    }
  }

  const track = echoCards.tracks as any;
  res.json({
    echo: {
      track_title: track?.title || '未知曲目',
      track_artist: track?.artist || '未知藝人',
      cover_url: track?.cover_url || null,
      recipient_taste_label: recipientLabel,
    },
  });
});
```

**查詢邏輯說明：**
- 用 `feedbacks!inner` join 確保只拿有 feedback 的卡片
- 時間範圍限定「昨天 UTC+8」
- `limit(1)` — 只取一筆（即使有多筆，只顯示一個最有衝擊力）

### 前端變更

**檔案：`apps/mobile/services/api.ts`**

新增函式：

```typescript
export interface YesterdayEcho {
  trackTitle: string;
  trackArtist: string;
  coverUrl: string | null;
  recipientTasteLabel: string;
}

export async function getYesterdayEcho(): Promise<YesterdayEcho | null> {
  if (!isSupabaseConfigured()) return null;

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  try {
    const res = await fetch(`${apiUrl}/api/roulette/yesterday-echo`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.echo) return null;
    return {
      trackTitle: json.echo.track_title,
      trackArtist: json.echo.track_artist,
      coverUrl: json.echo.cover_url,
      recipientTasteLabel: json.echo.recipient_taste_label,
    };
  } catch {
    return null;
  }
}
```

**檔案：`apps/mobile/components/YesterdayEcho.tsx`** (新增)

```typescript
// Animated toast component
// Props: { echo: YesterdayEcho; onDismiss: () => void }
// 自動 3 秒後 fade out + slideUp
// 樣式：半透明卡片，封面小圖 + "你推薦的「{title}」讓一位{label}感到驚喜！"
// 使用 Reanimated FadeInDown / FadeOutUp
```

**檔案：`apps/mobile/app/(tabs)/home.tsx`**

修改位置與邏輯：

```
Line 1:  import 加入 getYesterdayEcho, YesterdayEcho type
Line 31: 新增 state: const [echo, setEcho] = useState<YesterdayEcho | null>(null)
Line 57: useEffect 中 fetchCard 完成後呼叫 getYesterdayEcho().then(setEcho)
Line 117-124: Header 上方插入 {echo && <YesterdayEchoToast echo={echo} onDismiss={() => setEcho(null)} />}
```

### 工作量估計
- 後端 endpoint: ~30 行
- 前端 API 函式: ~25 行
- YesterdayEcho 元件: ~80 行（含動畫）
- Home 頁整合: ~10 行
- **總計：~145 行，預估 30 分鐘**

---

## B. First Discovery Badge — 首次類型解鎖徽章

### 概念
當用戶對某個 genre 的推薦首次給出「驚喜」回饋時，在 FeedbackSheet 的 post-submit 畫面即時顯示解鎖動畫。不需要新的 DB table，直接在 feedback 回傳的 insight 中附帶 badge 資訊。

### 資料流
```
用戶提交 'surprised' feedback
→ 後端 updateTasteVectorFromFeedback() 已計算 dominantShift
→ 額外查詢：這個用戶是否曾經對同 genre 的卡片給過 'surprised'？
→ 若是第一次 → insight 回傳多一個 newBadge 欄位
→ 前端 FeedbackSheet 收到 newBadge → 播放解鎖動畫
```

### 後端變更

**檔案：`apps/api/src/services/matching.ts`**

修改 `updateTasteVectorFromFeedback()` 回傳的 `TasteInsight`：

```typescript
// TasteInsight 新增欄位
export interface TasteInsight {
  oldVector: number[];
  newVector: number[];
  delta: number[];
  dominantShift: { genre: string; label: string; change: number } | null;
  genresExplored: number;
  newBadge: { genre: string; label: string; emoji: string } | null;  // ← 新增
}
```

在函式末尾（return 前），加入 badge 檢測邏輯：

```typescript
// Check if this is a first-time 'surprised' for this genre category
let newBadge: TasteInsight['newBadge'] = null;
if (reaction === 'surprised' && genres.length > 0) {
  // Map track genres to GENRE_CATEGORIES (same 6 categories as TasteRadar)
  const GENRE_CATEGORIES = [
    { key: 'pop_rnb', label: 'Pop/R&B 探索者', emoji: '🎤', indices: [0, 3, 18, 19] },
    { key: 'rock_metal', label: 'Rock/Metal 探索者', emoji: '🎸', indices: [1, 10, 11, 12] },
    { key: 'hiphop_soul', label: 'Hip-Hop/Soul 探索者', emoji: '🎧', indices: [2, 13, 14] },
    { key: 'electronic', label: 'Electronic 探索者', emoji: '🎹', indices: [6, 17] },
    { key: 'jazz_classical', label: 'Jazz/Classical 探索者', emoji: '🎷', indices: [4, 5] },
    { key: 'world_folk', label: 'World/Folk 探索者', emoji: '🌍', indices: [7, 8, 9, 15, 16] },
  ];

  // Find which category this track belongs to
  const trackGenreIndices = genres.map(g => GENRE_INDEX[g.toLowerCase()]).filter(i => i !== undefined);
  const matchedCategory = GENRE_CATEGORIES.find(cat =>
    cat.indices.some(i => trackGenreIndices.includes(i))
  );

  if (matchedCategory) {
    // Check: has user ever given 'surprised' to a track in this category before?
    const categoryGenres = matchedCategory.indices.map(i => GENRES[i]);

    const { data: prevSurprised } = await supabaseAdmin
      .from('feedbacks')
      .select(`
        id,
        roulette_cards!inner (track_id, tracks:track_id (genres))
      `)
      .eq('user_id', userId)
      .eq('reaction', 'surprised')
      .neq('card_id', cardId); // exclude current feedback (not yet committed at query time - use trackId instead)

    // Filter: did any previous surprised feedback's track share a category?
    const hadPrevious = (prevSurprised || []).some(fb => {
      const card = (fb as any).roulette_cards;
      const trackGenres: string[] = card?.tracks?.genres || [];
      return trackGenres.some(g => categoryGenres.includes(g.toLowerCase()));
    });

    if (!hadPrevious) {
      newBadge = {
        genre: matchedCategory.key,
        label: matchedCategory.label,
        emoji: matchedCategory.emoji,
      };
    }
  }
}
```

**注意事項：**
- 函式需要額外接收 `cardId` 參數（或直接用 trackId 排除）
- 查詢用 `neq('card_id', ...)` 排除當前這次 feedback

**檔案：`apps/api/src/routes/roulette.ts`**

在 `POST /:cardId/feedback` 的 insightPayload 中加入 `new_badge`：

```typescript
// 現有 line 147-155，修改為：
insightPayload = {
  old_vector: insight.oldVector,
  new_vector: insight.newVector,
  dominant_shift: insight.dominantShift,
  genres_explored: insight.genresExplored,
  new_badge: insight.newBadge,  // ← 新增
};
```

### 前端變更

**檔案：`packages/shared/types/index.ts`**

FeedbackInsight 新增欄位：

```typescript
export interface FeedbackInsight {
  oldVector: number[];
  newVector: number[];
  dominantShift: { genre: string; label: string; change: number } | null;
  genresExplored: number;
  newBadge: { genre: string; label: string; emoji: string } | null;  // ← 新增
}
```

**檔案：`apps/mobile/services/api.ts`**

在 `submitFeedback()` 的 json.insight 解析中加入 `newBadge`：

```typescript
// 現有 line 188-193，修改為：
return {
  oldVector: json.insight.old_vector || [],
  newVector: json.insight.new_vector || [],
  dominantShift: json.insight.dominant_shift || null,
  genresExplored: json.insight.genres_explored || 0,
  newBadge: json.insight.new_badge || null,  // ← 新增
};
```

**檔案：`apps/mobile/components/FeedbackSheet.tsx`**

在 submitted state 的 JSX 中，加入 badge 解鎖動畫：

```
位置：line 103-139 的 submittedContainer 內部
在 radar chart 和 shift indicator 之間插入：

{insight?.newBadge && (
  <Animated.View entering={FadeIn.delay(500).duration(600)} style={styles.badgeUnlock}>
    <Text style={styles.badgeUnlockEmoji}>{insight.newBadge.emoji}</Text>
    <Text style={styles.badgeUnlockTitle}>新徽章解鎖！</Text>
    <Text style={styles.badgeUnlockLabel}>{insight.newBadge.label}</Text>
  </Animated.View>
)}
```

新增 styles：
```typescript
badgeUnlock: {
  alignItems: 'center',
  backgroundColor: 'rgba(108,92,231,0.15)',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(108,92,231,0.3)',
  paddingVertical: 16,
  paddingHorizontal: 24,
  marginVertical: 12,
},
badgeUnlockEmoji: { fontSize: 40, marginBottom: 8 },
badgeUnlockTitle: { color: '#6C5CE7', fontSize: 14, fontWeight: '700', marginBottom: 4 },
badgeUnlockLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
```

### DB 變更
**無**。不需要新 table，badge 是即時計算的。

### 工作量估計
- 後端 matching.ts badge 邏輯: ~40 行
- 後端 route 修改: ~2 行
- 前端 types: ~1 行
- 前端 api.ts: ~1 行
- 前端 FeedbackSheet badge UI: ~30 行（含 styles）
- **總計：~74 行，預估 20 分鐘**

---

## C. Contextual Recommendation Prompt — 情境推薦引導

### 概念
用戶在 feedback 後進入推薦頁面時，根據剛才聽到的曲目提供情境化引導，而不是通用的「推薦一首你喜歡的歌給陌生人」。

### 資料流
```
用戶在 Home 頁給完 feedback → 點「去推薦」
→ router.push('/recommend') 時帶上 query params: trackTitle + trackArtist + genre
→ Recommend 頁讀取 params → 顯示情境化副標題和 placeholder

例如：
subtitle: "你剛聽了 Bohemian Rhapsody — 推薦一首同樣讓你震撼的歌"
placeholder: "跟 Queen 相比，這首歌為什麼值得一聽？"
```

### 前端變更（純前端，不需後端改動）

**檔案：`apps/mobile/app/(tabs)/home.tsx`**

修改「去推薦」按鈕的導航，帶上 context：

```typescript
// 現有 line 141
onPress={() => router.push('/recommend')}

// 改為：
onPress={() => {
  const track = todayCard?.track;
  if (track) {
    router.push({
      pathname: '/recommend',
      params: {
        contextTitle: track.title,
        contextArtist: track.artist,
        contextGenre: todayCard?.track?.genres?.[0] || '',
      },
    });
  } else {
    router.push('/recommend');
  }
}}
```

**檔案：`apps/mobile/app/recommend.tsx`**

修改以讀取 context params 並生成動態文案：

```typescript
// Line 1: 加入 useLocalSearchParams
import { router, useLocalSearchParams } from 'expo-router';

// Line 27-29 後加入：
const params = useLocalSearchParams<{
  contextTitle?: string;
  contextArtist?: string;
  contextGenre?: string;
}>();

const hasContext = !!(params.contextTitle);

// 生成動態文案
const headerSubtitle = hasContext
  ? `你剛聽了「${params.contextTitle}」— 推薦一首同樣精彩的歌`
  : '推薦一首你喜歡的歌給陌生人';

const reasonPlaceholder = hasContext
  ? `跟 ${params.contextArtist} 比起來，這首歌為什麼值得一聽？`
  : '用一句話告訴對方為什麼要聽這首';
```

```
// Line 126-128: 替換靜態文案
<Text style={styles.headerSubtitle}>
  {headerSubtitle}
</Text>

// Line 162-164: 替換靜態 placeholder
placeholder={reasonPlaceholder}
```

### 工作量估計
- Home 頁導航修改: ~10 行
- Recommend 頁 params + 動態文案: ~15 行
- **總計：~25 行，預估 10 分鐘**

---

## 實作順序

| 順序 | 功能 | 原因 |
|------|------|------|
| 1 | C. Contextual Prompt | 最簡單，純前端，零風險 |
| 2 | B. First Discovery Badge | 邏輯獨立，只修改已有的 feedback flow |
| 3 | A. Yesterday's Echo | 新 endpoint + 新元件，相對最複雜 |

## 總工作量

| 功能 | 新增行數 | 修改行數 | 新檔案 |
|------|---------|---------|--------|
| A. Yesterday's Echo | ~135 | ~10 | `YesterdayEcho.tsx` |
| B. First Discovery Badge | ~70 | ~4 | 無 |
| C. Contextual Prompt | ~0 | ~25 | 無 |
| **合計** | **~205** | **~39** | **1 個** |

## 風險與注意事項

1. **A: Supabase join 查詢** — `feedbacks!inner` join 需確認 FK 關係是否支援此語法。備案：分兩次查詢（先查 cards，再查 feedbacks）
2. **B: Badge 重複檢測的 N+1** — 目前每次 feedback 都會查歷史 surprised，但用戶量 < 1000 時不成問題。若需優化可改為 profiles 表加 `discovered_genres TEXT[]` 欄位快取
3. **C: Expo Router params 型別** — `useLocalSearchParams` 回傳 `string | string[]`，需注意型別轉換

## 驗證方式

1. **C** — 在 Home 頁點「去推薦」，確認副標題顯示剛才聽的歌名
2. **B** — 對一個新 genre 的卡片選「驚喜」，確認 FeedbackSheet 顯示徽章解鎖
3. **A** — 手動在 DB 插入一筆昨天的 surprised feedback（recommender = 自己），重開 Home 確認 toast 顯示
