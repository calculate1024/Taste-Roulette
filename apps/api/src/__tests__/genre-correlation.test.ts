import { CORRELATION_MATRIX, applyCorrelationInference } from '../utils/genre-correlation';
import { GENRES, VECTOR_DIM } from '../utils/genres';

describe('CORRELATION_MATRIX', () => {
  it('is a square matrix matching VECTOR_DIM', () => {
    expect(CORRELATION_MATRIX.length).toBe(VECTOR_DIM);
    for (const row of CORRELATION_MATRIX) {
      expect(row.length).toBe(VECTOR_DIM);
    }
  });

  it('has 1.0 on the diagonal', () => {
    for (let i = 0; i < VECTOR_DIM; i++) {
      expect(CORRELATION_MATRIX[i][i]).toBe(1.0);
    }
  });

  it('is symmetric', () => {
    for (let i = 0; i < VECTOR_DIM; i++) {
      for (let j = 0; j < VECTOR_DIM; j++) {
        expect(CORRELATION_MATRIX[i][j]).toBe(CORRELATION_MATRIX[j][i]);
      }
    }
  });

  it('has known correlations', () => {
    const popIdx = GENRES.indexOf('pop');
    const rbIdx = GENRES.indexOf('r&b');
    expect(CORRELATION_MATRIX[popIdx][rbIdx]).toBe(0.7);

    const rockIdx = GENRES.indexOf('rock');
    const metalIdx = GENRES.indexOf('metal');
    expect(CORRELATION_MATRIX[rockIdx][metalIdx]).toBe(0.6);
  });

  it('includes c-pop correlations', () => {
    const cpopIdx = GENRES.indexOf('c-pop');
    const popIdx = GENRES.indexOf('pop');
    expect(cpopIdx).toBe(20);
    expect(CORRELATION_MATRIX[cpopIdx][popIdx]).toBe(0.6);
  });
});

describe('applyCorrelationInference', () => {
  it('does not modify zero vectors', () => {
    const zero = new Array(VECTOR_DIM).fill(0);
    expect(applyCorrelationInference(zero)).toEqual(zero);
  });

  it('propagates signal to correlated dimensions', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    const popIdx = GENRES.indexOf('pop');
    vec[popIdx] = 1.0;

    const enhanced = applyCorrelationInference(vec);

    // pop -> r&b (0.7 * 0.4 = 0.28)
    const rbIdx = GENRES.indexOf('r&b');
    expect(enhanced[rbIdx]).toBeCloseTo(0.28, 2);

    // pop -> k-pop (0.6 * 0.4 = 0.24)
    const kpopIdx = GENRES.indexOf('k-pop');
    expect(enhanced[kpopIdx]).toBeCloseTo(0.24, 2);

    // pop itself unchanged
    expect(enhanced[popIdx]).toBe(1.0);

    // uncorrelated dimension stays 0
    const metalIdx = GENRES.indexOf('metal');
    expect(enhanced[metalIdx]).toBe(0);
  });

  it('does not override direct signals', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    const popIdx = GENRES.indexOf('pop');
    const rbIdx = GENRES.indexOf('r&b');
    vec[popIdx] = 1.0;
    vec[rbIdx] = -0.3; // Direct negative signal

    const enhanced = applyCorrelationInference(vec);

    // r&b should keep its direct signal, not be overridden by correlation
    expect(enhanced[rbIdx]).toBe(-0.3);
  });

  it('propagates negative signals correctly', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    const rockIdx = GENRES.indexOf('rock');
    vec[rockIdx] = -0.5;

    const enhanced = applyCorrelationInference(vec);

    // rock -> metal: -0.5 * 0.6 * 0.4 = -0.12
    // But we use Math.max, so negative propagation should NOT fill zeros
    // Actually, with Math.max(enhanced[j], propagated), if propagated is negative and enhanced[j] is 0:
    // Math.max(0, -0.12) = 0. So negative signals don't propagate. This is correct behavior.
    const metalIdx = GENRES.indexOf('metal');
    expect(enhanced[metalIdx]).toBe(0);
  });

  it('handles multiple contributing genres', () => {
    const vec = new Array(VECTOR_DIM).fill(0);
    const rockIdx = GENRES.indexOf('rock');
    const bluesIdx = GENRES.indexOf('blues');
    vec[rockIdx] = 0.8;
    vec[bluesIdx] = 0.6;

    const enhanced = applyCorrelationInference(vec);

    // indie gets signal from rock: 0.8 * 0.6 * 0.4 = 0.192
    // jazz gets signal from blues: 0.6 * 0.6 * 0.4 = 0.144
    const indieIdx = GENRES.indexOf('indie');
    expect(enhanced[indieIdx]).toBeCloseTo(0.192, 2);

    const jazzIdx = GENRES.indexOf('jazz');
    expect(enhanced[jazzIdx]).toBeCloseTo(0.144, 2);
  });
});
