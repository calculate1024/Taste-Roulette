// Pre-written curator reasons for seed tracks.
// Each track gets a warm, human-sounding reason instead of generic "Curator 精選推薦".

export const CURATOR_REASONS: Record<string, string> = {
  // Bohemian Rhapsody - Queen
  '4u7EnebtmKWzUH433cf5Qv': '六分鐘內橫跨歌劇、搖滾和敘事詩，每次聽都有新發現',
  // Blinding Lights - The Weeknd
  '0VjIjW4GlUZAMYd2vXMi3b': '80 年代合成器回魂，開車時音量轉到最大那種快感',
  // Take Five - Dave Brubeck
  '1YQWosTIljIvxAgHWTp7KP': '5/4 拍聽起來竟然這麼自然，爵士入門的完美第一首',
  // Strobe - deadmau5
  '6c9EGVj5CaOeoKd9ecMW1U': '前七分鐘的鋪陳等到 drop 的瞬間，整個世界都亮了',
  // Clair de Lune - Debussy
  '6Er8Fz6fuZNi5cvwQjv1ya': '月光下的鋼琴，一百年前的音樂依然能讓人起雞皮疙瘩',
  // Lose Yourself - Eminem
  '5Z01UMMf7V1o0MzF86s6WJ': '不管聽幾次，前奏一下還是會不自覺地專注起來',
  // Despacito - Luis Fonsi
  '6habFhsOp2NvshLv26DqMb': '拉丁節奏的感染力是跨語言的，身體比耳朵先反應',
  // Jolene ft. Dolly Parton
  '4i8xlL0EqaSj9piUVUOQQO': '用最溫柔的聲音唱最心碎的故事，反差感滿分',
  // Superstition - Stevie Wonder
  '1h2xVEoJORqrg71HocgqXd': 'Funk 的 groove 從第一秒就把你抓住不放',
  // Gangnam Style - PSY
  '03UrZgTINDqvnUMbbIMhql': '嚴肅地說，這首的節奏設計和 hook 真的是教科書等級',
  // Master of Puppets - Metallica
  '2MuWTIM3b0YEAskbeeFE1i': '金屬樂不只是大聲，這首的結構精密得像交響樂',
  // Skinny Love - Bon Iver
  '3B3eOgLJSqPEA0RfboIQVM': '在小木屋裡用假音唱的心碎，indie folk 的原點',
  // Weightless - Marconi Union
  '6kkwzB6hXLIONkEk9JciA6': '科學證實能降低焦慮 65% 的音樂，試試睡前聽',
  // Lemon - Kenshi Yonezu
  '04TshWXkhV1qkqHzf31Hn6': '米津玄師的旋律感是超越語言的，聽不懂歌詞也會被打動',
  // No Woman No Cry - Bob Marley
  '3PQLYVskjUeRmRIfECsL0X': '雷鬼的慵懶裡藏著最深的溫柔，適合雨天反覆聽',
};

// Taste labels for curator picks based on the track's primary genre
export const GENRE_CURATOR_LABELS: Record<string, string> = {
  'pop': 'Pop 愛好者',
  'rock': '搖滾魂',
  'hip-hop': '嘻哈控',
  'r&b': 'R&B 情歌派',
  'jazz': '爵士迷',
  'classical': '古典樂迷',
  'electronic': '電子控',
  'latin': '拉丁節奏',
  'country': '鄉村風',
  'folk': '民謠人',
  'metal': '金屬狂',
  'punk': '龐克精神',
  'indie': '獨立音樂人',
  'soul': '靈魂樂迷',
  'blues': '藍調迷',
  'reggae': '雷鬼風',
  'world': '世界音樂',
  'ambient': '氛圍派',
  'k-pop': 'K-Pop 粉',
  'j-pop': 'J-Pop 迷',
  'funk': '放克玩家',
};

/** Get a human-sounding reason for a curator track. Falls back to a generic genre-based reason. */
export function getCuratorReason(spotifyId: string, genres: string[]): string {
  if (CURATOR_REASONS[spotifyId]) {
    return CURATOR_REASONS[spotifyId];
  }
  // Fallback: genre-based generic reason
  const genre = genres[0] || 'music';
  const label = GENRE_CURATOR_LABELS[genre.toLowerCase()];
  if (label) {
    return `一位${label}覺得這首值得被更多人聽到`;
  }
  return '有人覺得這首歌值得被更多人聽到';
}

/** Get a taste label for curator picks based on the track's genre. */
export function getCuratorTasteLabel(genres: string[]): string {
  for (const g of genres) {
    const label = GENRE_CURATOR_LABELS[g.toLowerCase()];
    if (label) return label;
  }
  return '音樂探索者';
}
