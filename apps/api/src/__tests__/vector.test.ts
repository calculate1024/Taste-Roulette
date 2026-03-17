import { cosineDistance } from '../utils/vector';

describe('cosineDistance', () => {
  // --- Basic cases ---
  it('returns 0 for identical vectors', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineDistance(v, v)).toBeCloseTo(0, 10);
  });

  it('returns 1 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineDistance(a, b)).toBeCloseTo(1, 10);
  });

  it('returns 2 for opposite vectors', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineDistance(a, b)).toBeCloseTo(2, 10);
  });

  it('returns value between 0 and 1 for similar vectors', () => {
    const a = [1, 0.8, 0.3];
    const b = [0.9, 1, 0.2];
    const d = cosineDistance(a, b);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(0.5);
  });

  // --- Edge cases ---
  it('returns 1.0 for empty vectors', () => {
    expect(cosineDistance([], [])).toBe(1.0);
  });

  it('returns 1.0 when first vector is empty', () => {
    expect(cosineDistance([], [1, 2, 3])).toBe(1.0);
  });

  it('returns 1.0 when second vector is empty', () => {
    expect(cosineDistance([1, 2, 3], [])).toBe(1.0);
  });

  it('returns 1.0 for zero vectors', () => {
    expect(cosineDistance([0, 0, 0], [0, 0, 0])).toBe(1.0);
  });

  it('returns 1.0 when one vector is zero', () => {
    expect(cosineDistance([0, 0, 0], [1, 2, 3])).toBe(1.0);
  });

  it('handles single-dimension vectors', () => {
    expect(cosineDistance([3], [5])).toBeCloseTo(0, 10);
  });

  it('handles high-dimensional vectors (20-dim taste vectors)', () => {
    const a = Array.from({ length: 20 }, (_, i) => i * 0.1);
    const b = Array.from({ length: 20 }, (_, i) => (19 - i) * 0.1);
    const d = cosineDistance(a, b);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(2);
  });

  it('is symmetric: d(a,b) === d(b,a)', () => {
    const a = [0.5, 0.3, 0.8, 0.1];
    const b = [0.2, 0.9, 0.4, 0.6];
    expect(cosineDistance(a, b)).toBeCloseTo(cosineDistance(b, a), 10);
  });

  it('handles negative values', () => {
    const a = [1, -1, 0.5];
    const b = [0.5, 1, -0.5];
    const d = cosineDistance(a, b);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(2);
  });

  it('handles very small values without precision issues', () => {
    const a = [1e-10, 1e-10, 1e-10];
    const b = [1e-10, 1e-10, 1e-10];
    expect(cosineDistance(a, b)).toBeCloseTo(0, 5);
  });
});
