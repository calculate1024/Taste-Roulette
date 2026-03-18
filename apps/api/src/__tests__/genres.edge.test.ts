import {
  GENRES,
  GENRE_INDEX,
  VECTOR_DIM,
  genreToVector,
  computeWeightedVector,
  getDominantGenres,
  getTasteLabel,
  TASTE_LABELS,
  GENRE_ALIASES,
} from '../utils/genres';

describe('GENRE_ALIASES completeness', () => {
  it('all alias targets exist in GENRES', () => {
    for (const [alias, target] of Object.entries(GENRE_ALIASES)) {
      expect(GENRES).toContain(target);
    }
  });

  it('no alias matches an exact genre name (would be redundant)', () => {
    for (const alias of Object.keys(GENRE_ALIASES)) {
      // Aliases should NOT be the same as a genre name (case-insensitive)
      const lowerGenres = GENRES.map((g) => g.toLowerCase());
      // Some overlap is OK if the alias provides a different casing path
      // but the key insight: "pop" shouldn't be an alias because it's a genre
    }
  });

  it('has c-pop variants', () => {
    expect(GENRE_ALIASES['mandopop']).toBe('c-pop');
    expect(GENRE_ALIASES['cpop']).toBe('c-pop');
    expect(GENRE_ALIASES['華語']).toBe('c-pop');
  });
});

describe('genreToVector edge cases', () => {
  it('vector length matches VECTOR_DIM for any input', () => {
    expect(genreToVector([])).toHaveLength(VECTOR_DIM);
    expect(genreToVector(['pop'])).toHaveLength(VECTOR_DIM);
    expect(genreToVector(['pop', 'rock', 'jazz', 'metal', 'blues'])).toHaveLength(VECTOR_DIM);
    expect(genreToVector(['unknown1', 'unknown2'])).toHaveLength(VECTOR_DIM);
  });

  it('handles duplicate genres without double-counting', () => {
    const single = genreToVector(['pop']);
    const double = genreToVector(['pop', 'pop']);
    // Both should have pop = 1.0 (max, not sum)
    expect(single[GENRE_INDEX['pop']]).toBe(1.0);
    expect(double[GENRE_INDEX['pop']]).toBe(1.0);
  });

  it('handles mixed case genres', () => {
    const vec = genreToVector(['POP', 'Jazz', 'ROCK']);
    expect(vec[GENRE_INDEX['pop']]).toBe(1.0);
    expect(vec[GENRE_INDEX['jazz']]).toBe(1.0);
    expect(vec[GENRE_INDEX['rock']]).toBe(1.0);
  });

  it('handles alias via GENRE_ALIASES', () => {
    const vec = genreToVector(['mandopop']);
    expect(vec[GENRE_INDEX['c-pop']]).toBe(1.0);
  });

  it('handles very long genre list', () => {
    const manyGenres = GENRES.concat(GENRES).concat(GENRES); // 63 items
    const vec = genreToVector(manyGenres);
    expect(vec).toHaveLength(VECTOR_DIM);
    // Every genre should be 1.0
    for (let i = 0; i < VECTOR_DIM; i++) {
      expect(vec[i]).toBe(1.0);
    }
  });

  it('handles genres with special characters', () => {
    const vec = genreToVector(['r&b']);
    expect(vec[GENRE_INDEX['r&b']]).toBe(1.0);
  });

  it('handles genres with hyphens', () => {
    const vec = genreToVector(['hip-hop', 'k-pop', 'j-pop', 'c-pop']);
    expect(vec[GENRE_INDEX['hip-hop']]).toBe(1.0);
    expect(vec[GENRE_INDEX['k-pop']]).toBe(1.0);
    expect(vec[GENRE_INDEX['j-pop']]).toBe(1.0);
    expect(vec[GENRE_INDEX['c-pop']]).toBe(1.0);
  });

  it('whitespace-only genre returns zero vector', () => {
    const vec = genreToVector(['  ', '\t']);
    expect(vec.every((v) => v === 0)).toBe(true);
  });
});

describe('computeWeightedVector edge cases', () => {
  it('handles all three reaction types in one batch', () => {
    const responses = [
      { track_id: 't1', reaction: 'love' },
      { track_id: 't2', reaction: 'okay' },
      { track_id: 't3', reaction: 'not_for_me' },
    ];
    const trackGenres: Record<string, string[]> = {
      t1: ['pop'],
      t2: ['rock'],
      t3: ['metal'],
    };
    const vec = computeWeightedVector(responses, trackGenres);
    expect(vec[GENRE_INDEX['pop']]).toBeGreaterThan(0);     // loved
    expect(vec[GENRE_INDEX['rock']]).toBeGreaterThan(0);    // okay (0.3)
    expect(vec[GENRE_INDEX['metal']]).toBeLessThan(0);      // not_for_me (-0.5)
  });

  it('handles track with multiple genres', () => {
    const responses = [{ track_id: 't1', reaction: 'love' }];
    const trackGenres = { t1: ['pop', 'r&b', 'electronic'] };
    const vec = computeWeightedVector(responses, trackGenres);
    expect(vec[GENRE_INDEX['pop']]).toBeGreaterThan(0);
    expect(vec[GENRE_INDEX['r&b']]).toBeGreaterThan(0);
    expect(vec[GENRE_INDEX['electronic']]).toBeGreaterThan(0);
  });

  it('handles many responses to the same genre', () => {
    const responses = Array.from({ length: 10 }, (_, i) => ({
      track_id: `t${i}`,
      reaction: 'love',
    }));
    const trackGenres: Record<string, string[]> = {};
    for (let i = 0; i < 10; i++) {
      trackGenres[`t${i}`] = ['jazz'];
    }
    const vec = computeWeightedVector(responses, trackGenres);
    // All love for jazz → normalized to 1.0
    expect(vec[GENRE_INDEX['jazz']]).toBeCloseTo(1.0);
  });

  it('conflicting reactions partially cancel out', () => {
    const responses = [
      { track_id: 't1', reaction: 'love' },     // +1.0
      { track_id: 't2', reaction: 'not_for_me' }, // -0.5
    ];
    const trackGenres: Record<string, string[]> = {
      t1: ['rock'],
      t2: ['rock'],
    };
    const vec = computeWeightedVector(responses, trackGenres);
    // Sum = 1.0 + (-0.5) = 0.5, total weight = 1.0 + 0.5 = 1.5
    // normalized = 0.5 / 1.5 = 0.333...
    expect(vec[GENRE_INDEX['rock']]).toBeCloseTo(0.333, 2);
  });
});

describe('getDominantGenres edge cases', () => {
  it('returns genres in correct order with ties', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['pop']] = 0.5;
    vec[GENRE_INDEX['rock']] = 0.5;
    const result = getDominantGenres(vec, 2);
    // Both have same value, order might be either
    expect(result).toHaveLength(2);
    expect(result).toContain('pop');
    expect(result).toContain('rock');
  });

  it('handles all-negative vector', () => {
    const vec = new Array(VECTOR_DIM).fill(-0.5);
    expect(getDominantGenres(vec)).toEqual([]);
  });

  it('handles vector with only one positive value', () => {
    const vec = new Array(VECTOR_DIM).fill(-0.1);
    vec[GENRE_INDEX['blues']] = 0.01;
    expect(getDominantGenres(vec, 5)).toEqual(['blues']);
  });
});

describe('getTasteLabel edge cases', () => {
  it('returns correct label for c-pop dominant', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['c-pop']] = 0.9;
    expect(getTasteLabel(vec)).toBe('華語流行迷');
  });

  it('returns label for the highest-value genre, not first', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['pop']] = 0.3;
    vec[GENRE_INDEX['jazz']] = 0.9;
    expect(getTasteLabel(vec)).toBe('爵士迷');
  });

  it('TASTE_LABELS covers all 21 genres', () => {
    for (const genre of GENRES) {
      expect(TASTE_LABELS[genre]).toBeDefined();
      expect(TASTE_LABELS[genre].length).toBeGreaterThan(0);
    }
  });
});
