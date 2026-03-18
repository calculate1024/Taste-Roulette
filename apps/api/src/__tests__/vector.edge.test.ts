import { cosineDistance } from '../utils/vector';
import { VECTOR_DIM } from '../utils/genres';

describe('cosineDistance edge cases', () => {
  it('identical vectors have distance 0', () => {
    const a = [1, 2, 3, 4, 5];
    expect(cosineDistance(a, a)).toBeCloseTo(0, 10);
  });

  it('orthogonal vectors have distance 1', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineDistance(a, b)).toBeCloseTo(1, 10);
  });

  it('opposite vectors have distance 2', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineDistance(a, b)).toBeCloseTo(2, 10);
  });

  it('zero vector vs any vector returns 1', () => {
    const zero = [0, 0, 0, 0, 0];
    const some = [1, 2, 3, 4, 5];
    expect(cosineDistance(zero, some)).toBe(1);
  });

  it('both zero vectors return 1', () => {
    const zero = [0, 0, 0];
    expect(cosineDistance(zero, zero)).toBe(1);
  });

  it('proportional vectors have distance 0 (direction matters, not magnitude)', () => {
    const a = [1, 2, 3];
    const b = [2, 4, 6]; // same direction, 2x magnitude
    expect(cosineDistance(a, b)).toBeCloseTo(0, 10);
  });

  it('handles 21-dim genre vectors', () => {
    const a = new Array(VECTOR_DIM).fill(0);
    a[0] = 1; // pop
    const b = new Array(VECTOR_DIM).fill(0);
    b[20] = 1; // c-pop
    // Orthogonal (different dimensions)
    expect(cosineDistance(a, b)).toBeCloseTo(1, 10);
  });

  it('handles very small values without NaN', () => {
    const a = [0.00001, 0.00002, 0];
    const b = [0.00003, 0, 0.00001];
    const dist = cosineDistance(a, b);
    expect(isNaN(dist)).toBe(false);
    expect(dist).toBeGreaterThanOrEqual(0);
    expect(dist).toBeLessThanOrEqual(2);
  });

  it('handles negative values', () => {
    const a = [1, -0.5, 0.3];
    const b = [-0.2, 0.8, 0.1];
    const dist = cosineDistance(a, b);
    expect(isNaN(dist)).toBe(false);
    expect(dist).toBeGreaterThanOrEqual(0);
    expect(dist).toBeLessThanOrEqual(2);
  });

  it('is symmetric: distance(a,b) === distance(b,a)', () => {
    const a = [0.5, 0.3, 0.8, 0, 0.2];
    const b = [0.1, 0.7, 0, 0.4, 0.6];
    expect(cosineDistance(a, b)).toBeCloseTo(cosineDistance(b, a), 10);
  });

  it('single dimension vectors', () => {
    expect(cosineDistance([5], [3])).toBeCloseTo(0, 10); // same direction
    expect(cosineDistance([5], [-3])).toBeCloseTo(2, 10); // opposite
  });

  it('mismatched lengths produce NaN (known limitation)', () => {
    // When vectors have different lengths, a[2]*b[2] = 3*undefined = NaN
    // This documents the current behavior — callers must ensure same-length vectors
    const a = [1, 2, 3];
    const b = [1, 2];
    const dist = cosineDistance(a, b);
    expect(isNaN(dist)).toBe(true);
  });

  it('full 21-dim realistic taste vectors', () => {
    // Pop/R&B fan
    const popFan = new Array(VECTOR_DIM).fill(0);
    popFan[0] = 0.9;  // pop
    popFan[3] = 0.6;  // r&b
    popFan[18] = 0.4; // k-pop

    // Jazz/Classical fan
    const jazzFan = new Array(VECTOR_DIM).fill(0);
    jazzFan[4] = 0.8; // jazz
    jazzFan[5] = 0.5; // classical
    jazzFan[14] = 0.3; // blues

    // Similar pop fan
    const popFan2 = new Array(VECTOR_DIM).fill(0);
    popFan2[0] = 0.7;  // pop
    popFan2[3] = 0.8;  // r&b
    popFan2[6] = 0.3;  // electronic

    // popFan should be closer to popFan2 than to jazzFan
    expect(cosineDistance(popFan, popFan2)).toBeLessThan(cosineDistance(popFan, jazzFan));
  });
});
