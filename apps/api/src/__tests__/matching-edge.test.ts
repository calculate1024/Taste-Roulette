import { cosineDistance } from '../utils/vector';
import { genreToVector, computeWeightedVector, VECTOR_DIM, GENRE_INDEX } from '../utils/genres';

/**
 * Edge case tests for the matching/taste engine logic.
 * These test the algorithm components without requiring Supabase.
 */

describe('taste distance sweet spot matching', () => {
  const SWEET_SPOT_MIN = 0.3;
  const SWEET_SPOT_MAX = 0.7;

  function isInSweetSpot(dist: number): boolean {
    return dist >= SWEET_SPOT_MIN && dist <= SWEET_SPOT_MAX;
  }

  it('same-genre lovers are too similar (distance < 0.3)', () => {
    const vecA = genreToVector(['rock']);
    const vecB = genreToVector(['rock']);
    const dist = cosineDistance(vecA, vecB);
    expect(dist).toBeLessThan(SWEET_SPOT_MIN);
  });

  it('completely different genre users are in sweet spot or beyond', () => {
    const vecA = genreToVector(['rock']);
    const vecB = genreToVector(['classical']);
    const dist = cosineDistance(vecA, vecB);
    // Orthogonal genres → distance = 1.0 (too far)
    expect(dist).toBeGreaterThan(SWEET_SPOT_MAX);
  });

  it('partially overlapping genres can be in sweet spot', () => {
    // User A likes rock + indie, User B likes indie + folk
    const vecA = genreToVector(['rock', 'indie']);
    const vecB = genreToVector(['indie', 'folk']);
    const dist = cosineDistance(vecA, vecB);
    // They share "indie" but differ on rock vs folk
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(1);
  });

  it('weighted taste vectors produce meaningful distances', () => {
    // User A: loves rock, okay with pop
    const responsesA = [
      { track_id: 't1', reaction: 'love' },
      { track_id: 't2', reaction: 'okay' },
    ];
    const genresA: Record<string, string[]> = {
      t1: ['rock'],
      t2: ['pop'],
    };
    const vecA = computeWeightedVector(responsesA, genresA);

    // User B: loves jazz, not_for_me rock
    const responsesB = [
      { track_id: 't3', reaction: 'love' },
      { track_id: 't4', reaction: 'not_for_me' },
    ];
    const genresB: Record<string, string[]> = {
      t3: ['jazz'],
      t4: ['rock'],
    };
    const vecB = computeWeightedVector(responsesB, genresB);

    const dist = cosineDistance(vecA, vecB);
    // These users have different tastes — distance should be significant
    expect(dist).toBeGreaterThan(0.3);
  });
});

describe('edge cases in taste vector computation', () => {
  it('all-love responses produce a valid normalized vector', () => {
    const responses = [
      { track_id: 't1', reaction: 'love' },
      { track_id: 't2', reaction: 'love' },
      { track_id: 't3', reaction: 'love' },
    ];
    const genres: Record<string, string[]> = {
      t1: ['rock'],
      t2: ['pop'],
      t3: ['jazz'],
    };
    const vec = computeWeightedVector(responses, genres);

    // All values should be non-negative (all loved)
    expect(vec.every((v) => v >= 0)).toBe(true);
    // Should have non-zero values
    expect(vec.some((v) => v > 0)).toBe(true);
  });

  it('all-not_for_me responses produce negative vector', () => {
    const responses = [
      { track_id: 't1', reaction: 'not_for_me' },
      { track_id: 't2', reaction: 'not_for_me' },
    ];
    const genres: Record<string, string[]> = {
      t1: ['rock'],
      t2: ['pop'],
    };
    const vec = computeWeightedVector(responses, genres);

    // Negative weight genre positions should be negative
    expect(vec[GENRE_INDEX['rock']]).toBeLessThan(0);
    expect(vec[GENRE_INDEX['pop']]).toBeLessThan(0);
  });

  it('mixed reactions produce balanced vector', () => {
    const responses = [
      { track_id: 't1', reaction: 'love' },      // rock +1.0
      { track_id: 't2', reaction: 'not_for_me' }, // rock -0.5
    ];
    const genres: Record<string, string[]> = {
      t1: ['rock'],
      t2: ['rock'],
    };
    const vec = computeWeightedVector(responses, genres);

    // Net weight for rock: (1.0 - 0.5) / (1.0 + 0.5) = 0.5 / 1.5 ≈ 0.333
    expect(vec[GENRE_INDEX['rock']]).toBeCloseTo(0.333, 2);
  });

  it('large number of responses does not cause overflow', () => {
    const responses = Array.from({ length: 1000 }, (_, i) => ({
      track_id: `t${i}`,
      reaction: i % 3 === 0 ? 'love' : i % 3 === 1 ? 'okay' : 'not_for_me',
    }));
    const genres: Record<string, string[]> = {};
    for (let i = 0; i < 1000; i++) {
      genres[`t${i}`] = [['rock', 'pop', 'jazz'][i % 3]];
    }
    const vec = computeWeightedVector(responses, genres);

    // Should still produce finite values
    expect(vec.every(Number.isFinite)).toBe(true);
    expect(vec).toHaveLength(VECTOR_DIM);
  });

  it('duplicate track IDs are handled (same track rated twice)', () => {
    const responses = [
      { track_id: 't1', reaction: 'love' },
      { track_id: 't1', reaction: 'not_for_me' },
    ];
    const genres: Record<string, string[]> = {
      t1: ['rock'],
    };
    const vec = computeWeightedVector(responses, genres);

    // Should process both reactions
    expect(vec).toHaveLength(VECTOR_DIM);
    expect(vec[GENRE_INDEX['rock']]).toBeCloseTo(0.333, 2);
  });
});

describe('cosineDistance edge cases for matching', () => {
  it('distance between user and themselves is 0', () => {
    const vec = computeWeightedVector(
      [{ track_id: 't1', reaction: 'love' }],
      { t1: ['rock', 'pop'] }
    );
    expect(cosineDistance(vec, vec)).toBeCloseTo(0);
  });

  it('distance is stable across vector magnitudes', () => {
    // Cosine distance should be invariant to scaling
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const aScaled = a.map((v) => v * 100);
    const bScaled = b.map((v) => v * 100);

    expect(cosineDistance(a, b)).toBeCloseTo(cosineDistance(aScaled, bScaled), 10);
  });

  it('handles mismatched vector lengths gracefully', () => {
    // Shorter vector → some elements of longer vector are multiplied by undefined
    // This should not crash (though result may not be meaningful)
    const a = [1, 2, 3];
    const b = [1, 2];
    expect(() => cosineDistance(a, b)).not.toThrow();
  });
});
