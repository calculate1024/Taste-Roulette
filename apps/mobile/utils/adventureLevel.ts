// Adventure level mapping based on taste distance

export interface AdventureLevel {
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

/** Get adventure level from taste distance (0-1 scale). */
export function getAdventureLevel(distance: number | null): AdventureLevel {
  if (distance === null || distance === undefined) return LEVELS[2]; // default to unknown
  if (distance <= 0.2) return LEVELS[0];
  if (distance <= 0.4) return LEVELS[1];
  if (distance <= 0.6) return LEVELS[2];
  if (distance <= 0.8) return LEVELS[3];
  return LEVELS[4];
}
