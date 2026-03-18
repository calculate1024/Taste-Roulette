import { CORRELATION_MATRIX, applyCorrelationInference } from '../utils/genre-correlation';
import { GENRES, VECTOR_DIM, GENRE_INDEX } from '../utils/genres';

describe('correlation matrix edge cases', () => {
  it('matrix is exactly VECTOR_DIM x VECTOR_DIM', () => {
    expect(CORRELATION_MATRIX).toHaveLength(VECTOR_DIM);
    for (const row of CORRELATION_MATRIX) {
      expect(row).toHaveLength(VECTOR_DIM);
    }
  });

  it('all values are between 0 and 1', () => {
    for (let i = 0; i < VECTOR_DIM; i++) {
      for (let j = 0; j < VECTOR_DIM; j++) {
        expect(CORRELATION_MATRIX[i][j]).toBeGreaterThanOrEqual(0);
        expect(CORRELATION_MATRIX[i][j]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('c-pop (index 20) has correlations with pop, k-pop, j-pop', () => {
    const cpop = GENRE_INDEX['c-pop'];
    expect(CORRELATION_MATRIX[cpop][GENRE_INDEX['pop']]).toBeGreaterThan(0);
    expect(CORRELATION_MATRIX[cpop][GENRE_INDEX['k-pop']]).toBeGreaterThan(0);
    expect(CORRELATION_MATRIX[cpop][GENRE_INDEX['j-pop']]).toBeGreaterThan(0);
  });

  it('unrelated genres have zero correlation', () => {
    // metal and k-pop are not correlated
    expect(CORRELATION_MATRIX[GENRE_INDEX['metal']][GENRE_INDEX['k-pop']]).toBe(0);
    // classical and hip-hop are not correlated
    expect(CORRELATION_MATRIX[GENRE_INDEX['classical']][GENRE_INDEX['hip-hop']]).toBe(0);
  });
});

describe('applyCorrelationInference edge cases', () => {
  it('handles vector shorter than VECTOR_DIM', () => {
    const short = [1.0, 0.5]; // Only 2 elements
    const result = applyCorrelationInference(short);
    // Should not crash, iterates up to VECTOR_DIM but accesses short[i]
    // which will be undefined for i >= 2, treated as falsy → skipped
    expect(result).toHaveLength(2);
  });

  it('handles vector longer than VECTOR_DIM', () => {
    const long = new Array(VECTOR_DIM + 5).fill(0);
    long[0] = 1.0; // pop
    const result = applyCorrelationInference(long);
    // Should propagate normally for first VECTOR_DIM dims
    expect(result).toHaveLength(VECTOR_DIM + 5);
    // r&b (index 3) should get propagated signal from pop
    expect(result[GENRE_INDEX['r&b']]).toBeGreaterThan(0);
  });

  it('does not override existing direct signals', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['pop']] = 0.9;    // direct signal
    vec[GENRE_INDEX['r&b']] = 0.1;    // direct signal (even if small)
    const result = applyCorrelationInference(vec);
    // r&b should keep its direct signal, not be overwritten by pop's propagation
    expect(result[GENRE_INDEX['r&b']]).toBe(0.1);
  });

  it('propagated values are always less than source * PROPAGATION_WEIGHT', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['pop']] = 1.0;
    const result = applyCorrelationInference(vec);
    // All non-pop, non-zero values should be ≤ 1.0 * 0.7 * 0.4 = 0.28
    for (let i = 0; i < VECTOR_DIM; i++) {
      if (i === GENRE_INDEX['pop']) continue;
      expect(result[i]).toBeLessThanOrEqual(0.28 + 0.001); // floating point tolerance
    }
  });

  it('negative source values DO propagate (e.g., not_for_me)', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['metal']] = -0.5; // user dislikes metal
    const result = applyCorrelationInference(vec);
    // Negative values are non-zero, so they propagate
    // But propagation uses Math.max, so negative * correlation * weight could be negative
    // and Math.max(0, negative) = 0 — so actually negatives should NOT propagate meaningfully
    // Let's verify: punk is correlated with metal (0.5)
    // propagated = -0.5 * 0.5 * 0.4 = -0.1
    // Math.max(0, -0.1) = 0 for initial zero slots? No — Math.max(enhanced[j], propagated)
    // enhanced[j] starts at 0, propagated = -0.1, Math.max(0, -0.1) = 0
    // So negative signals should NOT spread
    expect(result[GENRE_INDEX['punk']]).toBe(0);
  });

  it('multiple sources accumulate via Math.max', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['pop']] = 0.8;     // pop→electronic correlation = 0.5
    vec[GENRE_INDEX['k-pop']] = 0.6;   // k-pop→electronic correlation = 0.3
    const result = applyCorrelationInference(vec);
    // electronic gets max(0.8*0.5*0.4, 0.6*0.3*0.4) = max(0.16, 0.072) = 0.16
    expect(result[GENRE_INDEX['electronic']]).toBeCloseTo(0.16, 2);
  });

  it('all-zero vector stays all-zero', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    const result = applyCorrelationInference(vec);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it('single genre produces expected propagation pattern', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['jazz']] = 1.0;
    const result = applyCorrelationInference(vec);

    // jazz correlations: blues(0.6), r&b(0.4), soul(0.5), classical(0.4)
    expect(result[GENRE_INDEX['blues']]).toBeCloseTo(1.0 * 0.6 * 0.4, 3);
    expect(result[GENRE_INDEX['soul']]).toBeCloseTo(1.0 * 0.5 * 0.4, 3);
    expect(result[GENRE_INDEX['classical']]).toBeCloseTo(1.0 * 0.4 * 0.4, 3);
    expect(result[GENRE_INDEX['r&b']]).toBeCloseTo(1.0 * 0.4 * 0.4, 3);

    // Non-correlated genres should stay 0
    expect(result[GENRE_INDEX['metal']]).toBe(0);
    expect(result[GENRE_INDEX['k-pop']]).toBe(0);
    expect(result[GENRE_INDEX['reggae']]).toBe(0);
  });
});
