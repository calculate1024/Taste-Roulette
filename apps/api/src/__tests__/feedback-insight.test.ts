import { genreToVector, VECTOR_DIM, GENRE_INDEX, GENRES } from '../utils/genres';

/**
 * Tests for the feedback-driven taste vector update (micro-insight) logic.
 * Tests the pure math without Supabase dependency.
 */

// Mirror the constants from matching.ts
const FEEDBACK_LEARNING_RATE = 0.1;
const FEEDBACK_WEIGHTS: Record<string, number> = {
  surprised: 1.0,
  okay: 0.2,
  not_for_me: -0.3,
};

// Mirror the genre categories from matching.ts (badge detection)
const GENRE_CATEGORIES = [
  { key: 'pop_rnb', label: 'Pop/R&B 探索者', emoji: '🎤', indices: [0, 3, 18, 19] },
  { key: 'rock_metal', label: 'Rock/Metal 探索者', emoji: '🎸', indices: [1, 10, 11, 12] },
  { key: 'hiphop_soul', label: 'Hip-Hop/Soul 探索者', emoji: '🎧', indices: [2, 13, 14] },
  { key: 'electronic', label: 'Electronic 探索者', emoji: '🎹', indices: [6, 17] },
  { key: 'jazz_classical', label: 'Jazz/Classical 探索者', emoji: '🎷', indices: [4, 5] },
  { key: 'world_folk', label: 'World/Folk 探索者', emoji: '🌍', indices: [7, 8, 9, 15, 16] },
];

/** Compute delta vector (mirrors matching.ts logic). */
function computeDelta(genres: string[], reaction: string): number[] {
  const genreVec = genreToVector(genres);
  const weight = FEEDBACK_WEIGHTS[reaction] ?? 0;
  return genreVec.map((v) => v * weight * FEEDBACK_LEARNING_RATE);
}

/** Apply delta to a taste vector (mirrors matching.ts logic). */
function applyDelta(oldVector: number[], delta: number[]): number[] {
  return oldVector.map((v, i) => v + delta[i]);
}

/** Find dominant shift from delta vector (mirrors matching.ts logic). */
function findDominantShift(delta: number[]): { genre: string; label: string; change: number } | null {
  let maxIdx = 0;
  let maxAbs = 0;
  for (let i = 0; i < delta.length; i++) {
    if (Math.abs(delta[i]) > maxAbs) {
      maxAbs = Math.abs(delta[i]);
      maxIdx = i;
    }
  }
  if (maxAbs === 0) return null;
  return {
    genre: GENRES[maxIdx],
    label: GENRES[maxIdx],
    change: +(delta[maxIdx].toFixed(3)),
  };
}

/** Find badge category for given genres (mirrors matching.ts logic). */
function findBadgeCategory(genres: string[]): typeof GENRE_CATEGORIES[0] | null {
  const trackGenreIndices = genres
    .map((g) => GENRE_INDEX[g.toLowerCase()])
    .filter((i): i is number => i !== undefined);
  return GENRE_CATEGORIES.find((cat) =>
    cat.indices.some((i) => trackGenreIndices.includes(i))
  ) || null;
}

describe('feedback delta computation', () => {
  it('surprised reaction produces positive delta for track genres', () => {
    const delta = computeDelta(['rock'], 'surprised');
    expect(delta[GENRE_INDEX['rock']]).toBeCloseTo(0.1); // 1.0 * 1.0 * 0.1
    // Other genres should be 0
    expect(delta[GENRE_INDEX['pop']]).toBe(0);
  });

  it('okay reaction produces smaller positive delta', () => {
    const delta = computeDelta(['rock'], 'okay');
    expect(delta[GENRE_INDEX['rock']]).toBeCloseTo(0.02); // 1.0 * 0.2 * 0.1
  });

  it('not_for_me reaction produces negative delta', () => {
    const delta = computeDelta(['rock'], 'not_for_me');
    expect(delta[GENRE_INDEX['rock']]).toBeCloseTo(-0.03); // 1.0 * -0.3 * 0.1
  });

  it('multi-genre track affects multiple dimensions', () => {
    const delta = computeDelta(['rock', 'indie'], 'surprised');
    expect(delta[GENRE_INDEX['rock']]).toBeCloseTo(0.1);
    expect(delta[GENRE_INDEX['indie']]).toBeCloseTo(0.1);
    expect(delta[GENRE_INDEX['pop']]).toBe(0);
  });

  it('empty genres produce zero delta', () => {
    const delta = computeDelta([], 'surprised');
    expect(delta.every((v) => v === 0)).toBe(true);
  });

  it('unknown reaction produces zero delta', () => {
    const delta = computeDelta(['rock'], 'unknown_reaction');
    expect(delta.every((v) => v === 0)).toBe(true);
  });

  it('delta has correct vector dimension', () => {
    const delta = computeDelta(['rock'], 'surprised');
    expect(delta).toHaveLength(VECTOR_DIM);
  });
});

describe('applying delta to taste vector', () => {
  it('surprised shifts vector toward that genre', () => {
    const old = new Array(VECTOR_DIM).fill(0);
    old[GENRE_INDEX['pop']] = 0.5; // user likes pop
    const delta = computeDelta(['rock'], 'surprised');
    const updated = applyDelta(old, delta);

    expect(updated[GENRE_INDEX['pop']]).toBe(0.5); // unchanged
    expect(updated[GENRE_INDEX['rock']]).toBeCloseTo(0.1); // new interest
  });

  it('not_for_me slightly reduces that genre', () => {
    const old = new Array(VECTOR_DIM).fill(0);
    old[GENRE_INDEX['rock']] = 0.5;
    const delta = computeDelta(['rock'], 'not_for_me');
    const updated = applyDelta(old, delta);

    expect(updated[GENRE_INDEX['rock']]).toBeCloseTo(0.47); // 0.5 - 0.03
  });

  it('incremental updates accumulate over multiple feedbacks', () => {
    let vec = new Array(VECTOR_DIM).fill(0);

    // Three surprised feedbacks for jazz
    for (let i = 0; i < 3; i++) {
      const delta = computeDelta(['jazz'], 'surprised');
      vec = applyDelta(vec, delta);
    }

    expect(vec[GENRE_INDEX['jazz']]).toBeCloseTo(0.3); // 3 * 0.1
  });

  it('learning rate prevents drastic single-feedback shifts', () => {
    const old = new Array(VECTOR_DIM).fill(0.5);
    const delta = computeDelta(['rock'], 'surprised');
    const updated = applyDelta(old, delta);

    // Max single-step change should be LEARNING_RATE * 1.0 = 0.1
    const maxChange = Math.max(
      ...delta.map((d) => Math.abs(d))
    );
    expect(maxChange).toBeLessThanOrEqual(0.1);
    // Original values should not change drastically
    expect(Math.abs(updated[GENRE_INDEX['rock']] - old[GENRE_INDEX['rock']])).toBeLessThanOrEqual(0.1);
  });
});

describe('dominant shift detection', () => {
  it('identifies the genre with largest absolute change', () => {
    const delta = computeDelta(['rock', 'indie'], 'surprised');
    // Both rock and indie get 0.1 (exact genre match = 1.0 weight)
    const shift = findDominantShift(delta);
    expect(shift).not.toBeNull();
    // Should be either rock or indie (both have same magnitude)
    expect(['rock', 'indie']).toContain(shift!.genre);
    expect(shift!.change).toBeCloseTo(0.1);
  });

  it('returns null for zero delta', () => {
    const delta = new Array(VECTOR_DIM).fill(0);
    expect(findDominantShift(delta)).toBeNull();
  });

  it('detects negative shifts for not_for_me', () => {
    const delta = computeDelta(['electronic'], 'not_for_me');
    const shift = findDominantShift(delta);
    expect(shift).not.toBeNull();
    expect(shift!.genre).toBe('electronic');
    expect(shift!.change).toBeLessThan(0);
  });
});

describe('badge category detection', () => {
  it('maps pop to pop_rnb category', () => {
    const cat = findBadgeCategory(['pop']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('pop_rnb');
  });

  it('maps rock to rock_metal category', () => {
    const cat = findBadgeCategory(['rock']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('rock_metal');
  });

  it('maps hip-hop to hiphop_soul category', () => {
    const cat = findBadgeCategory(['hip-hop']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('hiphop_soul');
  });

  it('maps electronic to electronic category', () => {
    const cat = findBadgeCategory(['electronic']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('electronic');
  });

  it('maps jazz to jazz_classical category', () => {
    const cat = findBadgeCategory(['jazz']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('jazz_classical');
  });

  it('maps classical to jazz_classical category', () => {
    const cat = findBadgeCategory(['classical']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('jazz_classical');
  });

  it('maps folk to world_folk category', () => {
    const cat = findBadgeCategory(['folk']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('world_folk');
  });

  it('maps k-pop to pop_rnb category', () => {
    const cat = findBadgeCategory(['k-pop']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('pop_rnb');
  });

  it('maps metal to rock_metal category', () => {
    const cat = findBadgeCategory(['metal']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('rock_metal');
  });

  it('maps ambient to electronic category', () => {
    const cat = findBadgeCategory(['ambient']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('electronic');
  });

  it('maps r&b to pop_rnb category', () => {
    const cat = findBadgeCategory(['r&b']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('pop_rnb');
  });

  it('maps soul to hiphop_soul category', () => {
    const cat = findBadgeCategory(['soul']);
    expect(cat).not.toBeNull();
    expect(cat!.key).toBe('hiphop_soul');
  });

  it('returns null for empty genres', () => {
    expect(findBadgeCategory([])).toBeNull();
  });

  it('returns null for unknown genres', () => {
    expect(findBadgeCategory(['polka', 'zydeco'])).toBeNull();
  });

  it('uses first matching category for multi-genre track', () => {
    // rock + jazz → should match one of the two categories
    const cat = findBadgeCategory(['rock', 'jazz']);
    expect(cat).not.toBeNull();
    expect(['rock_metal', 'jazz_classical']).toContain(cat!.key);
  });

  it('all 20 genres map to exactly one category', () => {
    // Verify every genre in GENRES is covered by exactly one category
    for (const genre of GENRES) {
      const cat = findBadgeCategory([genre]);
      expect(cat).not.toBeNull();
    }
  });

  it('categories cover all genre indices 0-19', () => {
    const allIndices = GENRE_CATEGORIES.flatMap((c) => c.indices).sort((a, b) => a - b);
    const expected = Array.from({ length: 20 }, (_, i) => i);
    expect(allIndices).toEqual(expected);
  });

  it('has correct emoji for each category', () => {
    const emojiMap: Record<string, string> = {
      pop_rnb: '🎤',
      rock_metal: '🎸',
      hiphop_soul: '🎧',
      electronic: '🎹',
      jazz_classical: '🎷',
      world_folk: '🌍',
    };
    for (const cat of GENRE_CATEGORIES) {
      expect(cat.emoji).toBe(emojiMap[cat.key]);
    }
  });
});
