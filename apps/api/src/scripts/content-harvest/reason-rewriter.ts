// Template-based reason generation — casual zh-TW, like a friend sharing a link
// Mix of ultra-short ("推") and brief impressions ("很舒服的一首"), no genre-specific details.

const SHORT = [
  '推',
  '試試看',
  '聽聽看',
  '我覺得不錯',
  '分享一下',
  '推薦',
  '給你聽聽',
  '你聽這首',
];

const MEDIUM = [
  '很舒服的一首',
  '意外好聽',
  '越聽越有味道',
  '很耐聽',
  '聽完心情很好',
  '適合一個人的時候聽',
  '隨機聽到的，滿喜歡',
  '蠻好聽的',
  '單曲循環好幾次了',
  '很舒服',
  '聽完會想再聽一次',
  '滿推的',
  '聽了好幾遍',
  '放鬆的時候很適合',
  '偶然發現的好歌',
  '氣氛很對',
];

const ALL = [...SHORT, ...MEDIUM];

const usedInBatch = new Set<string>();

/** Generate a casual, human-sounding reason in zh-TW. Genre-agnostic. */
export function generateReason(_genres: string[]): string {
  // Pick unused template if possible
  const available = ALL.filter((t) => !usedInBatch.has(t));
  const candidates = available.length > 0 ? available : ALL;

  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedInBatch.add(template);

  return template;
}

/** Reset used templates between sources. */
export function resetReasonBatch(): void {
  usedInBatch.clear();
}
