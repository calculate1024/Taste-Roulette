// Adventure level mapping based on taste distance

export interface AdventureLevel {
  key: 'comfort' | 'small' | 'unknown' | 'bold' | 'extreme';
  labelKey: string;
  emoji: string;
  color: string;
  descriptionKey: string;
}

const LEVELS: AdventureLevel[] = [
  { key: 'comfort', labelKey: 'adventureLevel.comfort', emoji: '🟢', color: '#2ECC71', descriptionKey: 'adventureLevel.comfortDesc' },
  { key: 'small', labelKey: 'adventureLevel.small', emoji: '🔵', color: '#3498DB', descriptionKey: 'adventureLevel.smallDesc' },
  { key: 'unknown', labelKey: 'adventureLevel.unknown', emoji: '🟣', color: '#6C5CE7', descriptionKey: 'adventureLevel.unknownDesc' },
  { key: 'bold', labelKey: 'adventureLevel.bold', emoji: '🟠', color: '#E67E22', descriptionKey: 'adventureLevel.boldDesc' },
  { key: 'extreme', labelKey: 'adventureLevel.extreme', emoji: '🔴', color: '#E74C3C', descriptionKey: 'adventureLevel.extremeDesc' },
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
