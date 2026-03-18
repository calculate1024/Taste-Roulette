/**
 * Tests for the adventure level classification logic.
 * Mirrors the pure function from apps/mobile/utils/adventureLevel.ts
 * to verify boundary conditions and tier mapping.
 */

// Replicate the types and logic from the mobile utility for testing
interface AdventureLevel {
  key: 'comfort' | 'small' | 'unknown' | 'bold' | 'extreme';
  label: string;
  emoji: string;
  color: string;
  description: string;
}

const LEVELS: AdventureLevel[] = [
  { key: 'comfort', label: '舒適圈', emoji: '🟢', color: '#2ECC71', description: '跟你的品味很接近' },
  { key: 'small', label: '小冒險', emoji: '🔵', color: '#3498DB', description: '稍微跳脫了一點' },
  { key: 'unknown', label: '未知領域', emoji: '🟣', color: '#6C5CE7', description: '你很少接觸的領域' },
  { key: 'bold', label: '大膽探索', emoji: '🟠', color: '#E67E22', description: '離你的舒適圈很遠' },
  { key: 'extreme', label: '極限挑戰', emoji: '🔴', color: '#E74C3C', description: '完全不同的品味世界' },
];

function getAdventureLevel(distance: number | null): AdventureLevel {
  if (distance === null || distance === undefined) return LEVELS[2];
  if (distance <= 0.2) return LEVELS[0];
  if (distance <= 0.4) return LEVELS[1];
  if (distance <= 0.6) return LEVELS[2];
  if (distance <= 0.8) return LEVELS[3];
  return LEVELS[4];
}

describe('adventure level tiers', () => {
  it('null distance defaults to unknown', () => {
    expect(getAdventureLevel(null).key).toBe('unknown');
  });

  it('distance 0 is comfort zone', () => {
    expect(getAdventureLevel(0).key).toBe('comfort');
  });

  it('distance 0.1 is comfort zone', () => {
    expect(getAdventureLevel(0.1).key).toBe('comfort');
  });

  it('distance 0.2 is comfort zone (boundary)', () => {
    expect(getAdventureLevel(0.2).key).toBe('comfort');
  });

  it('distance 0.21 is small adventure', () => {
    expect(getAdventureLevel(0.21).key).toBe('small');
  });

  it('distance 0.3 is small adventure', () => {
    expect(getAdventureLevel(0.3).key).toBe('small');
  });

  it('distance 0.4 is small adventure (boundary)', () => {
    expect(getAdventureLevel(0.4).key).toBe('small');
  });

  it('distance 0.41 is unknown territory', () => {
    expect(getAdventureLevel(0.41).key).toBe('unknown');
  });

  it('distance 0.5 is unknown territory (sweet spot center)', () => {
    expect(getAdventureLevel(0.5).key).toBe('unknown');
  });

  it('distance 0.6 is unknown territory (boundary)', () => {
    expect(getAdventureLevel(0.6).key).toBe('unknown');
  });

  it('distance 0.61 is bold exploration', () => {
    expect(getAdventureLevel(0.61).key).toBe('bold');
  });

  it('distance 0.7 is bold exploration', () => {
    expect(getAdventureLevel(0.7).key).toBe('bold');
  });

  it('distance 0.8 is bold exploration (boundary)', () => {
    expect(getAdventureLevel(0.8).key).toBe('bold');
  });

  it('distance 0.81 is extreme challenge', () => {
    expect(getAdventureLevel(0.81).key).toBe('extreme');
  });

  it('distance 1.0 is extreme challenge', () => {
    expect(getAdventureLevel(1.0).key).toBe('extreme');
  });
});

describe('adventure level metadata', () => {
  it('each level has a unique key', () => {
    const keys = LEVELS.map((l) => l.key);
    expect(new Set(keys).size).toBe(5);
  });

  it('each level has a unique emoji', () => {
    const emojis = LEVELS.map((l) => l.emoji);
    expect(new Set(emojis).size).toBe(5);
  });

  it('each level has a unique color', () => {
    const colors = LEVELS.map((l) => l.color);
    expect(new Set(colors).size).toBe(5);
  });

  it('all levels have non-empty labels and descriptions', () => {
    for (const level of LEVELS) {
      expect(level.label.length).toBeGreaterThan(0);
      expect(level.description.length).toBeGreaterThan(0);
    }
  });

  it('colors are valid hex codes', () => {
    for (const level of LEVELS) {
      expect(level.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('adventure level alignment with sweet spot', () => {
  const SWEET_SPOT_MIN = 0.3;
  const SWEET_SPOT_MAX = 0.7;

  it('sweet spot range covers small, unknown, and part of bold tiers', () => {
    // The sweet spot (0.3-0.7) should map to interesting adventure levels
    expect(getAdventureLevel(SWEET_SPOT_MIN).key).toBe('small');
    expect(getAdventureLevel(0.5).key).toBe('unknown');
    expect(getAdventureLevel(SWEET_SPOT_MAX).key).toBe('bold');
  });

  it('below sweet spot is comfort zone', () => {
    expect(getAdventureLevel(0.1).key).toBe('comfort');
    expect(getAdventureLevel(0.2).key).toBe('comfort');
  });

  it('above sweet spot includes bold and extreme', () => {
    expect(getAdventureLevel(0.75).key).toBe('bold');
    expect(getAdventureLevel(0.9).key).toBe('extreme');
  });
});
