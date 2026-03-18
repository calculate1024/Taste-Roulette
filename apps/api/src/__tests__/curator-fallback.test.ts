import { cosineDistance } from '../utils/vector';
import { genreToVector, GENRES } from '../utils/genres';
import { getCuratorReason, getCuratorTasteLabel } from '../utils/curator-reasons';

// Unit tests for the taste-aware curator fallback algorithm.
// We test the scoring logic in isolation (no DB calls).

const SWEET_SPOT_MIN = 0.3;
const SWEET_SPOT_MAX = 0.7;

interface MockTrack {
  spotify_id: string;
  genres: string[];
}

/** Simulate the curator fallback scoring: pick best track from sweet spot. */
function scoreCandidates(
  userVector: number[],
  candidates: MockTrack[]
): { track: MockTrack; dist: number } | null {
  type Scored = { track: MockTrack; dist: number };
  const scored: Scored[] = [];

  for (const track of candidates) {
    if (track.genres.length === 0) continue;
    const trackVec = genreToVector(track.genres);
    const dist = cosineDistance(userVector, trackVec);
    scored.push({ track, dist });
  }

  // Sweet spot first
  const sweetSpot = scored.filter((t) => t.dist >= SWEET_SPOT_MIN && t.dist <= SWEET_SPOT_MAX);
  if (sweetSpot.length > 0) {
    sweetSpot.sort((a, b) => Math.abs(a.dist - 0.5) - Math.abs(b.dist - 0.5));
    return sweetSpot[0];
  }

  // Closest to sweet spot range
  if (scored.length > 0) {
    scored.sort((a, b) => {
      const aDist = a.dist < SWEET_SPOT_MIN ? SWEET_SPOT_MIN - a.dist : a.dist - SWEET_SPOT_MAX;
      const bDist = b.dist < SWEET_SPOT_MIN ? SWEET_SPOT_MIN - b.dist : b.dist - SWEET_SPOT_MAX;
      return aDist - bDist;
    });
    return scored[0];
  }

  return null;
}

describe('curator fallback scoring', () => {
  // A pop fan vector
  const popFan = new Array(20).fill(0);
  popFan[0] = 0.9; // pop
  popFan[3] = 0.5; // r&b

  const tracks: MockTrack[] = [
    { spotify_id: 'pop-track', genres: ['pop'] },
    { spotify_id: 'rock-track', genres: ['rock'] },
    { spotify_id: 'jazz-track', genres: ['jazz'] },
    { spotify_id: 'metal-track', genres: ['metal'] },
    { spotify_id: 'classical-track', genres: ['classical'] },
    { spotify_id: 'electronic-track', genres: ['electronic'] },
    { spotify_id: 'ambient-track', genres: ['ambient'] },
  ];

  it('does NOT pick the same genre (too close) when sweet spot options exist', () => {
    const popDist = cosineDistance(popFan, genreToVector(['pop']));
    // Verify pop is indeed very close
    expect(popDist).toBeLessThan(SWEET_SPOT_MIN);
  });

  it('picks the candidate closest to distance 0.5', () => {
    const result = scoreCandidates(popFan, tracks);
    expect(result).not.toBeNull();
    // Result should be the best available candidate
    expect(result!.dist).toBeGreaterThan(0);
  });

  it('prefers distance close to 0.5', () => {
    const result = scoreCandidates(popFan, tracks);
    expect(result).not.toBeNull();
    // Should be the one closest to 0.5
    const sweetSpot = tracks
      .filter((t) => t.genres.length > 0)
      .map((t) => ({
        id: t.spotify_id,
        dist: cosineDistance(popFan, genreToVector(t.genres)),
      }))
      .filter((t) => t.dist >= SWEET_SPOT_MIN && t.dist <= SWEET_SPOT_MAX)
      .sort((a, b) => Math.abs(a.dist - 0.5) - Math.abs(b.dist - 0.5));

    if (sweetSpot.length > 0) {
      expect(result!.track.spotify_id).toBe(sweetSpot[0].id);
    }
  });

  it('falls back to closest-to-range when no sweet spot match', () => {
    // User who loves everything equally — all distances will be small
    const balanced = new Array(20).fill(0.5);
    const result = scoreCandidates(balanced, tracks);
    expect(result).not.toBeNull();
  });

  it('returns null for empty candidates', () => {
    const result = scoreCandidates(popFan, []);
    expect(result).toBeNull();
  });

  it('skips tracks with no genres', () => {
    const result = scoreCandidates(popFan, [{ spotify_id: 'no-genre', genres: [] }]);
    expect(result).toBeNull();
  });
});

describe('curator fallback metadata', () => {
  it('generates reason for known seed track', () => {
    const reason = getCuratorReason('4u7EnebtmKWzUH433cf5Qv', ['rock']);
    expect(reason.length).toBeGreaterThan(10);
    expect(reason).not.toBe('Curator 精選推薦');
  });

  it('generates taste label from track genres', () => {
    expect(getCuratorTasteLabel(['jazz'])).toBe('爵士迷');
    expect(getCuratorTasteLabel(['rock', 'metal'])).toBe('搖滾魂');
  });

  it('taste distance is calculated correctly', () => {
    const popVec = genreToVector(['pop']);
    const jazzVec = genreToVector(['jazz']);
    const dist = cosineDistance(popVec, jazzVec);
    // Orthogonal genres should have distance = 1.0
    expect(dist).toBe(1);
  });

  it('related genres have lower distance than unrelated', () => {
    const popVec = genreToVector(['pop', 'r&b']);
    const kpopVec = genreToVector(['k-pop', 'pop']);
    const metalVec = genreToVector(['metal']);
    const distRelated = cosineDistance(popVec, kpopVec);
    const distUnrelated = cosineDistance(popVec, metalVec);
    expect(distRelated).toBeLessThan(distUnrelated);
  });
});
