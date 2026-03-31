// Test: badge unlock conditions

interface BadgeDef {
  id: string;
  check: (stats: UserStats) => boolean;
}

interface UserStats {
  surpriseCount: number;
  genresExplored: number;
  streakCount: number;
  recommendCount: number;
  maxTasteDistance: number;
}

const BADGES: BadgeDef[] = [
  { id: 'first_surprise', check: (s) => s.surpriseCount >= 1 },
  { id: 'genre_explorer', check: (s) => s.genresExplored >= 5 },
  { id: 'streak_7', check: (s) => s.streakCount >= 7 },
  { id: 'streak_30', check: (s) => s.streakCount >= 30 },
  { id: 'recommender', check: (s) => s.recommendCount >= 10 },
  { id: 'max_distance', check: (s) => s.maxTasteDistance >= 0.8 },
];

function getUnlockedBadges(stats: UserStats): string[] {
  return BADGES.filter((b) => b.check(stats)).map((b) => b.id);
}

describe('Badge unlock logic', () => {
  it('no badges for new user', () => {
    const stats: UserStats = {
      surpriseCount: 0,
      genresExplored: 0,
      streakCount: 0,
      recommendCount: 0,
      maxTasteDistance: 0,
    };
    expect(getUnlockedBadges(stats)).toEqual([]);
  });

  it('first surprise unlocks badge', () => {
    const stats: UserStats = {
      surpriseCount: 1,
      genresExplored: 0,
      streakCount: 0,
      recommendCount: 0,
      maxTasteDistance: 0,
    };
    expect(getUnlockedBadges(stats)).toContain('first_surprise');
  });

  it('multiple badges can unlock simultaneously', () => {
    const stats: UserStats = {
      surpriseCount: 5,
      genresExplored: 6,
      streakCount: 8,
      recommendCount: 0,
      maxTasteDistance: 0.5,
    };
    const badges = getUnlockedBadges(stats);
    expect(badges).toContain('first_surprise');
    expect(badges).toContain('genre_explorer');
    expect(badges).toContain('streak_7');
    expect(badges).not.toContain('streak_30');
  });

  it('all badges unlock with max stats', () => {
    const stats: UserStats = {
      surpriseCount: 100,
      genresExplored: 20,
      streakCount: 30,
      recommendCount: 10,
      maxTasteDistance: 0.9,
    };
    expect(getUnlockedBadges(stats)).toHaveLength(BADGES.length);
  });
});
