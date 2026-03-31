// Test: taste vector update logic

const GENRES = [
  'pop', 'rock', 'hip-hop', 'r&b', 'jazz', 'classical', 'electronic',
  'latin', 'country', 'folk', 'metal', 'punk', 'indie', 'soul',
  'blues', 'reggae', 'world', 'ambient', 'k-pop', 'j-pop',
];

function getGenreIndex(genre: string): number {
  return GENRES.indexOf(genre.toLowerCase());
}

function getDominantShift(
  vector: number[],
  trackGenres: string[],
  reaction: string,
): { genre: string; delta: number } | null {
  const weights: Record<string, number> = {
    surprised: 0.05,
    okay: 0.02,
    not_for_me: -0.03,
  };
  const weight = weights[reaction] ?? 0;

  // Find the first track genre that exists in GENRES
  for (const g of trackGenres) {
    const idx = getGenreIndex(g);
    if (idx >= 0) {
      return { genre: GENRES[idx], delta: weight };
    }
  }
  return null;
}

describe('Taste vector updates', () => {
  const userVector = new Array(20).fill(0.5);

  it('returns correct genre for folk track', () => {
    const result = getDominantShift(userVector, ['folk', 'rock'], 'okay');
    expect(result).not.toBeNull();
    expect(result!.genre).toBe('folk');
    expect(result!.delta).toBe(0.02);
  });

  it('uses first matching genre', () => {
    const result = getDominantShift(userVector, ['indie', 'rock'], 'surprised');
    expect(result!.genre).toBe('indie');
  });

  it('negative delta for not_for_me', () => {
    const result = getDominantShift(userVector, ['pop'], 'not_for_me');
    expect(result!.delta).toBe(-0.03);
  });

  it('returns null for unknown genre', () => {
    const result = getDominantShift(userVector, ['unknown-genre'], 'okay');
    expect(result).toBeNull();
  });

  it('Taylor Swift exile should update folk, not rock', () => {
    // Track genres: ['folk', 'rock'] — first match is folk
    const result = getDominantShift(userVector, ['folk', 'rock'], 'okay');
    expect(result!.genre).toBe('folk');
    expect(result!.genre).not.toBe('rock');
  });
});
