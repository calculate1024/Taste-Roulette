import {
  GENRES,
  GENRE_INDEX,
  VECTOR_DIM,
  REACTION_WEIGHTS,
  genreToVector,
  computeWeightedVector,
  getDominantGenres,
  getTasteLabel,
} from '../utils/genres';

describe('genre constants', () => {
  it('has 21 genres (including c-pop)', () => {
    expect(GENRES).toHaveLength(21);
    expect(GENRES).toContain('c-pop');
  });

  it('VECTOR_DIM matches GENRES length', () => {
    expect(VECTOR_DIM).toBe(GENRES.length);
  });

  it('GENRE_INDEX maps every genre to a unique index', () => {
    const indices = new Set(Object.values(GENRE_INDEX));
    expect(indices.size).toBe(GENRES.length);
    for (const g of GENRES) {
      expect(GENRE_INDEX[g]).toBeDefined();
    }
  });

  it('REACTION_WEIGHTS has correct values', () => {
    expect(REACTION_WEIGHTS.love).toBe(1.0);
    expect(REACTION_WEIGHTS.okay).toBe(0.3);
    expect(REACTION_WEIGHTS.not_for_me).toBe(-0.5);
  });
});

describe('genreToVector', () => {
  it('creates correct one-hot for a single known genre', () => {
    const vec = genreToVector(['rock']);
    expect(vec[GENRE_INDEX['rock']]).toBe(1.0);
    // All other positions should be 0
    const nonZeroCount = vec.filter((v) => v !== 0).length;
    expect(nonZeroCount).toBe(1);
  });

  it('creates multi-hot for multiple genres', () => {
    const vec = genreToVector(['pop', 'r&b']);
    expect(vec[GENRE_INDEX['pop']]).toBe(1.0);
    expect(vec[GENRE_INDEX['r&b']]).toBe(1.0);
  });

  it('returns zero vector for empty genre list', () => {
    const vec = genreToVector([]);
    expect(vec.every((v) => v === 0)).toBe(true);
  });

  it('returns zero vector for unknown genres', () => {
    const vec = genreToVector(['polka', 'zydeco']);
    expect(vec.every((v) => v === 0)).toBe(true);
  });

  it('handles case-insensitive matching', () => {
    const vec = genreToVector(['Rock', 'JAZZ']);
    expect(vec[GENRE_INDEX['rock']]).toBe(1.0);
    expect(vec[GENRE_INDEX['jazz']]).toBe(1.0);
  });

  it('handles alias matching (e.g., "indie rock" → indie)', () => {
    const vec = genreToVector(['indie rock']);
    // "indie rock" is in GENRE_ALIASES → mapped to 'indie' at 1.0
    expect(vec[GENRE_INDEX['indie']]).toBe(1.0);
  });

  it('handles alias matching for c-pop variants', () => {
    expect(genreToVector(['mandopop'])[GENRE_INDEX['c-pop']]).toBe(1.0);
    expect(genreToVector(['cpop'])[GENRE_INDEX['c-pop']]).toBe(1.0);
    expect(genreToVector(['華語'])[GENRE_INDEX['c-pop']]).toBe(1.0);
  });

  it('always returns vector of VECTOR_DIM length', () => {
    expect(genreToVector([])).toHaveLength(VECTOR_DIM);
    expect(genreToVector(['pop'])).toHaveLength(VECTOR_DIM);
    expect(genreToVector(['unknown'])).toHaveLength(VECTOR_DIM);
  });
});

describe('computeWeightedVector', () => {
  it('computes weighted average for love + not_for_me responses', () => {
    const responses = [
      { track_id: 't1', reaction: 'love' },
      { track_id: 't2', reaction: 'not_for_me' },
    ];
    const trackGenres: Record<string, string[]> = {
      t1: ['rock'],
      t2: ['pop'],
    };
    const vec = computeWeightedVector(responses, trackGenres);

    // rock should be positive (loved), pop should be negative (not_for_me)
    expect(vec[GENRE_INDEX['rock']]).toBeGreaterThan(0);
    expect(vec[GENRE_INDEX['pop']]).toBeLessThan(0);
  });

  it('returns zero vector when no responses', () => {
    const vec = computeWeightedVector([], {});
    expect(vec.every((v) => v === 0)).toBe(true);
  });

  it('returns zero vector when no track genres found', () => {
    const responses = [{ track_id: 'missing', reaction: 'love' }];
    const vec = computeWeightedVector(responses, {});
    expect(vec.every((v) => v === 0)).toBe(true);
  });

  it('handles tracks with empty genre arrays', () => {
    const responses = [{ track_id: 't1', reaction: 'love' }];
    const trackGenres = { t1: [] as string[] };
    const vec = computeWeightedVector(responses, trackGenres);
    expect(vec.every((v) => v === 0)).toBe(true);
  });

  it('normalizes by total weight', () => {
    // All love for same genre → should be 1.0 / 1.0 = 1.0 at that position
    const responses = [
      { track_id: 't1', reaction: 'love' },
      { track_id: 't2', reaction: 'love' },
    ];
    const trackGenres: Record<string, string[]> = {
      t1: ['jazz'],
      t2: ['jazz'],
    };
    const vec = computeWeightedVector(responses, trackGenres);
    // Both weight 1.0, total weight 2.0
    // Each contributes 1.0 * 1.0 = 1.0 to jazz, sum = 2.0, normalized = 2.0/2.0 = 1.0
    expect(vec[GENRE_INDEX['jazz']]).toBeCloseTo(1.0);
  });

  it('handles unknown reaction gracefully (weight defaults to 0)', () => {
    const responses = [{ track_id: 't1', reaction: 'skip' }];
    const trackGenres = { t1: ['rock'] };
    const vec = computeWeightedVector(responses, trackGenres);
    expect(vec.every((v) => v === 0)).toBe(true);
  });
});

describe('getDominantGenres', () => {
  it('returns top N genres sorted by value', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['rock']] = 0.8;
    vec[GENRE_INDEX['jazz']] = 0.5;
    vec[GENRE_INDEX['pop']] = 0.3;
    vec[GENRE_INDEX['classical']] = 0.1;

    expect(getDominantGenres(vec, 3)).toEqual(['rock', 'jazz', 'pop']);
  });

  it('returns empty array for zero vector', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    expect(getDominantGenres(vec)).toEqual([]);
  });

  it('excludes genres with zero or negative values', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['rock']] = 0.5;
    vec[GENRE_INDEX['pop']] = -0.3;
    expect(getDominantGenres(vec)).toEqual(['rock']);
  });

  it('defaults to top 3', () => {
    const vec = new Array(VECTOR_DIM).fill(0.1);
    expect(getDominantGenres(vec)).toHaveLength(3);
  });

  it('handles empty vector', () => {
    expect(getDominantGenres([])).toEqual([]);
  });
});

describe('getTasteLabel', () => {
  it('returns label for dominant genre', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['jazz']] = 0.9;
    expect(getTasteLabel(vec)).toBe('爵士迷');
  });

  it('returns default label for zero vector', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    expect(getTasteLabel(vec)).toBe('音樂探索者');
  });

  it('returns default label for empty vector', () => {
    expect(getTasteLabel([])).toBe('音樂探索者');
  });
});
