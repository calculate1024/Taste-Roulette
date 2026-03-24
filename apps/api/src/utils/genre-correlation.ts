// Genre correlation matrix for cold-start inference.
// When a user reacts to a genre during onboarding, correlated genres
// receive a propagated signal (40% weight) to fill sparse vectors.
//
// Sources: music domain knowledge, co-occurrence patterns
// Will be refined with real user data in the future.

import { GENRES, VECTOR_DIM } from './genres';

// 0.4 chosen as balance: high enough to meaningfully fill sparse vectors during
// cold start (e.g., 8-10 swipes → only 3-4 non-zero dims without propagation),
// but low enough that propagated signals don't dominate direct signals.
// At 0.4, a pop=1.0 signal propagates r&b to 0.28 (1.0 * 0.7 * 0.4) — meaningful
// but clearly secondary. Will be refined with real user data.
const PROPAGATION_WEIGHT = 0.4;

// Pairwise correlations (bidirectional). Only specify > 0.3 correlations.
// Format: [genreA, genreB, correlation_strength]
// correlation_strength: 0.3 = weak, 0.5 = moderate, 0.7 = strong, 0.9 = very strong
const GENRE_PAIRS: [string, string, number][] = [
  // Pop family
  ['pop', 'r&b', 0.7],
  ['pop', 'k-pop', 0.6],
  ['pop', 'j-pop', 0.5],
  ['pop', 'c-pop', 0.6],
  ['pop', 'electronic', 0.5],
  ['pop', 'latin', 0.4],

  // R&B / Soul / Hip-Hop cluster
  ['r&b', 'soul', 0.8],
  ['r&b', 'hip-hop', 0.7],
  ['hip-hop', 'soul', 0.5],
  ['r&b', 'jazz', 0.4],
  ['soul', 'blues', 0.6],
  ['soul', 'jazz', 0.5],

  // Rock family
  ['rock', 'indie', 0.6],
  ['rock', 'metal', 0.6],
  ['rock', 'punk', 0.7],
  ['rock', 'blues', 0.5],
  ['indie', 'folk', 0.6],
  ['indie', 'punk', 0.4],
  ['metal', 'punk', 0.5],

  // Electronic family
  ['electronic', 'ambient', 0.6],
  ['electronic', 'k-pop', 0.3],

  // Jazz / Classical / Blues cluster
  ['jazz', 'blues', 0.6],
  ['jazz', 'classical', 0.4],
  ['classical', 'ambient', 0.5],

  // World / Folk / Latin cluster
  ['world', 'latin', 0.5],
  ['world', 'folk', 0.5],
  ['world', 'reggae', 0.5],
  ['latin', 'reggae', 0.4],
  ['folk', 'country', 0.6],

  // Asian pop cluster
  ['k-pop', 'j-pop', 0.5],
  ['k-pop', 'c-pop', 0.4],
  ['j-pop', 'c-pop', 0.4],
];

// Genre correlation lookup: maps each genre to its correlated genres sorted by strength (descending).
// Used by onboarding to find "adjacent" genres for discovery tracks.
function buildGenreCorrelations(): Record<string, { genre: string; strength: number }[]> {
  const map: Record<string, { genre: string; strength: number }[]> = {};
  for (const [a, b, strength] of GENRE_PAIRS) {
    if (!map[a]) map[a] = [];
    if (!map[b]) map[b] = [];
    map[a].push({ genre: b, strength });
    map[b].push({ genre: a, strength });
  }
  // Sort each list by strength descending
  for (const key of Object.keys(map)) {
    map[key].sort((x, y) => y.strength - x.strength);
  }
  return map;
}

export const GENRE_CORRELATIONS = buildGenreCorrelations();

// Build the full correlation matrix (21x21)
function buildCorrelationMatrix(): number[][] {
  const matrix: number[][] = Array.from({ length: VECTOR_DIM }, () =>
    new Array(VECTOR_DIM).fill(0)
  );

  // Self-correlation = 1.0
  for (let i = 0; i < VECTOR_DIM; i++) {
    matrix[i][i] = 1.0;
  }

  // Fill from pairs (bidirectional)
  const genreIndex: Record<string, number> = {};
  GENRES.forEach((g, i) => { genreIndex[g] = i; });

  for (const [a, b, strength] of GENRE_PAIRS) {
    const iA = genreIndex[a];
    const iB = genreIndex[b];
    if (iA !== undefined && iB !== undefined) {
      matrix[iA][iB] = strength;
      matrix[iB][iA] = strength;
    }
  }

  return matrix;
}

export const CORRELATION_MATRIX = buildCorrelationMatrix();

/**
 * Apply correlation-based inference to a raw taste vector.
 * For each dimension with a non-zero value, propagate a weighted signal
 * to correlated dimensions (only if target is still zero — don't override direct signals).
 *
 * @param rawVector - The directly computed taste vector from swipe responses
 * @returns Enhanced vector with correlated dimensions filled in
 */
export function applyCorrelationInference(rawVector: number[]): number[] {
  const enhanced = [...rawVector];

  for (let i = 0; i < VECTOR_DIM; i++) {
    if (rawVector[i] === 0) continue; // No signal in this dimension

    for (let j = 0; j < VECTOR_DIM; j++) {
      if (i === j) continue; // Skip self
      if (rawVector[j] !== 0) continue; // Don't override direct signals

      const correlation = CORRELATION_MATRIX[i][j];
      if (correlation <= 0) continue;

      const propagated = rawVector[i] * correlation * PROPAGATION_WEIGHT;
      // Accumulate (multiple genres can contribute to the same target)
      enhanced[j] = Math.max(enhanced[j], propagated);
    }
  }

  return enhanced;
}
