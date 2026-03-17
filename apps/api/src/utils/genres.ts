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
