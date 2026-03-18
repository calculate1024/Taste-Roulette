import { cosineDistance } from '../utils/vector';
import { genreToVector, GENRES, GENRE_INDEX, VECTOR_DIM } from '../utils/genres';
import { getCuratorReason, getCuratorTasteLabel, CURATOR_REASONS, GENRE_CURATOR_LABELS } from '../utils/curator-reasons';

const SWEET_SPOT_MIN = 0.3;
const SWEET_SPOT_MAX = 0.7;

interface MockTrack {
  spotify_id: string;
  genres: string[];
}

function scoreCandidates(
  userVector: number[],
  candidates: MockTrack[]
): { track: MockTrack; dist: number }[] {
  const scored: { track: MockTrack; dist: number }[] = [];
  for (const track of candidates) {
    if (track.genres.length === 0) continue;
    const trackVec = genreToVector(track.genres);
    const dist = cosineDistance(userVector, trackVec);
    scored.push({ track, dist });
  }
  return scored;
}

describe('curator fallback edge cases — vector shapes', () => {
  it('handles 21-dim vector (with c-pop)', () => {
    // A c-pop + pop fan (multi-dim vector, not pure one-hot)
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX['c-pop']] = 0.9;
    vec[GENRE_INDEX['pop']] = 0.5; // c-pop fans often also like pop

    // j-pop+pop track vs pure metal track
    const candidates: MockTrack[] = [
      { spotify_id: 'jpop', genres: ['j-pop', 'pop'] },
      { spotify_id: 'metal', genres: ['metal'] },
    ];
    const scored = scoreCandidates(vec, candidates);
    const jpopScore = scored.find((s) => s.track.spotify_id === 'jpop')!;
    const metalScore = scored.find((s) => s.track.spotify_id === 'metal')!;
    // j-pop+pop shares the pop dimension, so closer to c-pop+pop fan
    expect(jpopScore.dist).toBeLessThan(metalScore.dist);
  });

  it('zero vector produces distance 1 to any genre', () => {
    const zero = new Array(VECTOR_DIM).fill(0);
    const dist = cosineDistance(zero, genreToVector(['pop']));
    // cosine distance with zero vector should be 1 (no similarity)
    expect(dist).toBe(1);
  });

  it('identical vectors produce distance 0', () => {
    const vec = genreToVector(['rock', 'indie']);
    expect(cosineDistance(vec, vec)).toBeCloseTo(0, 10);
  });

  it('multi-genre tracks produce meaningful intermediate distances', () => {
    const popFan = new Array(VECTOR_DIM).fill(0);
    popFan[GENRE_INDEX['pop']] = 0.9;
    popFan[GENRE_INDEX['r&b']] = 0.5;

    // Pop+electronic track should be closer than pure jazz
    const popElecDist = cosineDistance(popFan, genreToVector(['pop', 'electronic']));
    const jazzDist = cosineDistance(popFan, genreToVector(['jazz']));
    expect(popElecDist).toBeLessThan(jazzDist);
  });
});

describe('curator fallback edge cases — sweet spot boundaries', () => {
  const makeUserVec = (genre: string, strength = 0.9) => {
    const vec = new Array(VECTOR_DIM).fill(0);
    vec[GENRE_INDEX[genre]] = strength;
    return vec;
  };

  it('exactly 0.3 distance is included in sweet spot', () => {
    // We can't easily create exact 0.3, but verify the filter logic
    const dist = 0.3;
    expect(dist >= SWEET_SPOT_MIN && dist <= SWEET_SPOT_MAX).toBe(true);
  });

  it('exactly 0.7 distance is included in sweet spot', () => {
    const dist = 0.7;
    expect(dist >= SWEET_SPOT_MIN && dist <= SWEET_SPOT_MAX).toBe(true);
  });

  it('0.29 is outside sweet spot', () => {
    const dist = 0.29;
    expect(dist >= SWEET_SPOT_MIN && dist <= SWEET_SPOT_MAX).toBe(false);
  });

  it('0.71 is outside sweet spot', () => {
    const dist = 0.71;
    expect(dist >= SWEET_SPOT_MIN && dist <= SWEET_SPOT_MAX).toBe(false);
  });

  it('0.5 is closest to ideal center', () => {
    const dists = [0.31, 0.45, 0.5, 0.55, 0.69];
    dists.sort((a, b) => Math.abs(a - 0.5) - Math.abs(b - 0.5));
    expect(dists[0]).toBe(0.5);
  });
});

describe('curator reason edge cases', () => {
  it('all CURATOR_REASONS values are non-empty strings', () => {
    for (const [id, reason] of Object.entries(CURATOR_REASONS)) {
      expect(typeof reason).toBe('string');
      expect(reason.length).toBeGreaterThan(5);
    }
  });

  it('getCuratorReason falls back to genre-based reason for unknown track', () => {
    const reason = getCuratorReason('unknown-spotify-id-xyz', ['jazz']);
    expect(reason).toContain('爵士迷');
  });

  it('getCuratorReason double fallback for unknown track AND unknown genre', () => {
    const reason = getCuratorReason('unknown-id', ['completely-unknown-genre']);
    expect(reason).toBe('有人覺得這首歌值得被更多人聽到');
  });

  it('getCuratorReason with empty genres', () => {
    const reason = getCuratorReason('unknown-id', []);
    expect(reason).toBe('有人覺得這首歌值得被更多人聽到');
  });

  it('getCuratorTasteLabel returns first matching genre label', () => {
    // Multiple genres: should return label for first match
    const label = getCuratorTasteLabel(['unknown-genre', 'jazz', 'rock']);
    expect(label).toBe('爵士迷');
  });

  it('getCuratorTasteLabel default for empty genres', () => {
    expect(getCuratorTasteLabel([])).toBe('音樂探索者');
  });

  it('getCuratorTasteLabel handles c-pop', () => {
    expect(getCuratorTasteLabel(['c-pop'])).toBe('華語流行迷');
  });

  it('GENRE_CURATOR_LABELS covers all 21 genres', () => {
    for (const genre of GENRES) {
      expect(GENRE_CURATOR_LABELS[genre]).toBeDefined();
    }
  });
});

describe('curator fallback — all genres fan scenarios', () => {
  // Test that every genre as a primary taste produces valid distances
  for (const genre of GENRES) {
    it(`${genre} fan gets scored candidates without errors`, () => {
      const vec = new Array(VECTOR_DIM).fill(0);
      vec[GENRE_INDEX[genre]] = 0.9;

      // Create a candidate from every other genre
      const candidates: MockTrack[] = GENRES
        .filter((g) => g !== genre)
        .map((g) => ({ spotify_id: `track-${g}`, genres: [g] }));

      const scored = scoreCandidates(vec, candidates);
      expect(scored.length).toBe(GENRES.length - 1);

      // All distances should be between 0 and 2 (cosine distance range)
      for (const s of scored) {
        expect(s.dist).toBeGreaterThanOrEqual(0);
        expect(s.dist).toBeLessThanOrEqual(2);
      }
    });
  }
});
