// Reason generation for harvested tracks.
// Uses source attribution. Excerpt stored for future LLM rewriting but NOT used directly
// (copyright concern: cannot reproduce original article text verbatim).

const CASUAL_POOL = [
  '推', '試試看', '聽聽看', '我覺得不錯', '分享一下', '給你聽聽', '推薦', '你聽這首',
  '很舒服的一首', '意外好聽', '越聽越有味道', '很耐聽', '聽完心情很好',
  '適合一個人的時候聽', '隨機聽到的，滿喜歡', '蠻好聽的', '單曲循環好幾次了',
  '聽完會想再聽一次', '滿推的', '偶然發現的好歌', '氣氛很對',
];

// Source display names
const SOURCE_LABELS: Record<string, string> = {
  earmilk: 'Earmilk',
  stereofox: 'Stereofox',
  'metal-sucks': 'MetalSucks',
  ftlob: 'For The Love Of Bands',
  'npr-music': 'NPR Music',
  consequence: 'Consequence',
  tsis: 'This Song Is Sick',
  indieshuffle: 'Indie Shuffle',
  loudwire: 'Loudwire',
  'bandcamp-daily': 'Bandcamp Daily',
};

const usedInBatch = new Set<string>();

/**
 * Generate a reason for a harvested track.
 * Uses source attribution ("{Source} 推薦"). Excerpt is intentionally NOT used
 * directly to avoid copyright issues — stored for future LLM rewriting.
 */
export function generateReason(
  _genres: string[],
  _articleTitle?: string,
  sourceName?: string,
  _excerpt?: string, // reserved for future LLM rewriting
): string {
  // Source attribution
  const sourceLabel = sourceName ? SOURCE_LABELS[sourceName] || sourceName : null;
  if (sourceLabel) {
    return `${sourceLabel} 推薦`;
  }

  // Fallback: casual pool
  const available = CASUAL_POOL.filter((t) => !usedInBatch.has(t));
  const candidates = available.length > 0 ? available : CASUAL_POOL;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedInBatch.add(template);
  return template;
}

/** Reset used templates between sources. */
export function resetReasonBatch(): void {
  usedInBatch.clear();
}
