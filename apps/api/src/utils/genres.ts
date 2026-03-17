// Shared genre constants and vector utilities
// Must match Python taste_engine.py exactly

export const GENRES = [
  'pop', 'rock', 'hip-hop', 'r&b', 'jazz', 'classical', 'electronic',
  'latin', 'country', 'folk', 'metal', 'punk', 'indie', 'soul',
  'blues', 'reggae', 'world', 'ambient', 'k-pop', 'j-pop',
];

export const GENRE_INDEX: Record<string, number> = {};
GENRES.forEach((g, i) => { GENRE_INDEX[g] = i; });

export const VECTOR_DIM = GENRES.length;

export const REACTION_WEIGHTS: Record<string, number> = {
  love: 1.0,
  okay: 0.3,
  not_for_me: -0.5,
};

/** Convert genre strings to a one-hot-ish vector (mirrors Python genre_to_vector). */
export function genreToVector(genres: string[]): number[] {
  const vec = new Array(VECTOR_DIM).fill(0);
  for (const genre of genres) {
    const lower = genre.toLowerCase();
    // Exact match
    if (lower in GENRE_INDEX) {
      vec[GENRE_INDEX[lower]] = 1.0;
      continue;
    }
    // Partial match (e.g., "indie rock" matches both "indie" and "rock")
    for (const [g, idx] of Object.entries(GENRE_INDEX)) {
      if (lower.includes(g) || g.includes(lower)) {
        vec[idx] = 0.5;
      }
    }
  }
  return vec;
}

/** Compute taste vector from onboarding responses and track genres. */
export function computeWeightedVector(
  responses: { track_id: string; reaction: string }[],
  trackGenres: Record<string, string[]>
): number[] {
  const weightedSum = new Array(VECTOR_DIM).fill(0);
  let weightTotal = 0;

  for (const resp of responses) {
    const weight = REACTION_WEIGHTS[resp.reaction] ?? 0;
    const genres = trackGenres[resp.track_id];
    if (!genres || genres.length === 0) continue;

    const genreVec = genreToVector(genres);
    for (let i = 0; i < VECTOR_DIM; i++) {
      weightedSum[i] += weight * genreVec[i];
    }
    weightTotal += Math.abs(weight);
  }

  if (weightTotal === 0) {
    return new Array(VECTOR_DIM).fill(0);
  }

  return weightedSum.map((v: number) => v / weightTotal);
}

// Taste label mapping for dominant genres
export const TASTE_LABELS: Record<string, string> = {
  'pop': 'Pop 愛好者',
  'rock': '搖滾魂',
  'hip-hop': '嘻哈控',
  'r&b': 'R&B 情歌派',
  'jazz': '爵士迷',
  'classical': '古典樂迷',
  'electronic': '電子控',
  'latin': '拉丁節奏',
  'country': '鄉村風',
  'folk': '民謠人',
  'metal': '金屬狂',
  'punk': '龐克精神',
  'indie': '獨立音樂人',
  'soul': '靈魂樂迷',
  'blues': '藍調迷',
  'reggae': '雷鬼風',
  'world': '世界音樂',
  'ambient': '氛圍派',
  'k-pop': 'K-Pop 粉',
  'j-pop': 'J-Pop 迷',
};

/** Get top N dominant genres from a taste vector. */
export function getDominantGenres(vector: number[], count = 3): string[] {
  const indexed = vector.map((val, i) => ({ val, genre: GENRES[i] || '' }));
  indexed.sort((a, b) => b.val - a.val);
  return indexed
    .filter((item) => item.val > 0)
    .slice(0, count)
    .map((item) => item.genre);
}

/** Get taste label based on dominant genre. */
export function getTasteLabel(vector: number[]): string {
  const dominant = getDominantGenres(vector);
  if (dominant.length === 0) return '音樂探索者';
  return TASTE_LABELS[dominant[0]] || '音樂探索者';
}
