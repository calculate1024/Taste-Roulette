// Maps raw external tags (Last.fm, MusicBrainz) to our internal genre system.
// Our genres: pop, rock, hip-hop, r&b, jazz, classical, electronic, latin,
//             country, folk, metal, punk, indie, soul, blues, reggae, world,
//             ambient, k-pop, j-pop, c-pop

/**
 * Map of external tag names -> our internal genre.
 * Only common, unambiguous mappings are included.
 */
export const TAG_TO_GENRE: Record<string, string> = {
  // Pop
  'pop': 'pop',
  'pop rock': 'pop',
  'dance pop': 'pop',
  'synth-pop': 'pop',
  'synthpop': 'pop',
  'electropop': 'pop',
  'teen pop': 'pop',
  'power pop': 'pop',
  'art pop': 'pop',
  'chamber pop': 'pop',
  'dream pop': 'indie',
  'britpop': 'rock',

  // Rock
  'rock': 'rock',
  'alternative rock': 'rock',
  'alt rock': 'rock',
  'alternative': 'rock',
  'classic rock': 'rock',
  'hard rock': 'rock',
  'progressive rock': 'rock',
  'psychedelic rock': 'rock',
  'garage rock': 'rock',
  'grunge': 'rock',
  'soft rock': 'rock',
  'arena rock': 'rock',
  'southern rock': 'rock',

  // Hip-Hop
  'hip-hop': 'hip-hop',
  'hip hop': 'hip-hop',
  'rap': 'hip-hop',
  'trap': 'hip-hop',
  'gangsta rap': 'hip-hop',
  'conscious hip hop': 'hip-hop',
  'underground hip hop': 'hip-hop',
  'east coast hip hop': 'hip-hop',
  'west coast hip hop': 'hip-hop',
  'southern hip hop': 'hip-hop',
  'dirty south': 'hip-hop',
  'boom bap': 'hip-hop',
  'drill': 'hip-hop',
  'grime': 'hip-hop',

  // R&B
  'r&b': 'r&b',
  'rnb': 'r&b',
  'rhythm and blues': 'r&b',
  'contemporary r&b': 'r&b',
  'neo soul': 'r&b',
  'new jack swing': 'r&b',
  'alternative r&b': 'r&b',

  // Jazz
  'jazz': 'jazz',
  'smooth jazz': 'jazz',
  'bebop': 'jazz',
  'cool jazz': 'jazz',
  'free jazz': 'jazz',
  'jazz fusion': 'jazz',
  'swing': 'jazz',
  'big band': 'jazz',
  'bossa nova': 'jazz',
  'latin jazz': 'jazz',
  'acid jazz': 'jazz',

  // Classical
  'classical': 'classical',
  'classical music': 'classical',
  'orchestra': 'classical',
  'orchestral': 'classical',
  'baroque': 'classical',
  'romantic': 'classical',
  'contemporary classical': 'classical',
  'minimalism': 'classical',
  'opera': 'classical',
  'piano': 'classical',
  'chamber music': 'classical',
  'symphony': 'classical',

  // Electronic
  'electronic': 'electronic',
  'electronica': 'electronic',
  'edm': 'electronic',
  'house': 'electronic',
  'deep house': 'electronic',
  'tech house': 'electronic',
  'progressive house': 'electronic',
  'techno': 'electronic',
  'trance': 'electronic',
  'dubstep': 'electronic',
  'drum and bass': 'electronic',
  'dnb': 'electronic',
  'garage': 'electronic',
  'uk garage': 'electronic',
  'idm': 'electronic',
  'breakbeat': 'electronic',
  'future bass': 'electronic',
  'hardstyle': 'electronic',

  // Latin
  'latin': 'latin',
  'reggaeton': 'latin',
  'salsa': 'latin',
  'bachata': 'latin',
  'cumbia': 'latin',
  'merengue': 'latin',
  'latin pop': 'latin',
  'latin rock': 'latin',
  'samba': 'latin',
  'mpb': 'latin',
  'brazilian': 'latin',

  // Country
  'country': 'country',
  'country rock': 'country',
  'outlaw country': 'country',
  'alt-country': 'country',
  'americana': 'country',
  'bluegrass': 'country',
  'country pop': 'country',
  'nashville': 'country',

  // Folk
  'folk': 'folk',
  'folk rock': 'folk',
  'indie folk': 'folk',
  'singer-songwriter': 'folk',
  'acoustic': 'folk',
  'new folk': 'folk',
  'freak folk': 'folk',

  // Metal
  'metal': 'metal',
  'heavy metal': 'metal',
  'death metal': 'metal',
  'black metal': 'metal',
  'thrash metal': 'metal',
  'power metal': 'metal',
  'doom metal': 'metal',
  'progressive metal': 'metal',
  'metalcore': 'metal',
  'nu metal': 'metal',
  'symphonic metal': 'metal',

  // Punk
  'punk': 'punk',
  'punk rock': 'punk',
  'post-punk': 'punk',
  'pop punk': 'punk',
  'hardcore': 'punk',
  'hardcore punk': 'punk',
  'emo': 'punk',
  'post-hardcore': 'punk',
  'ska punk': 'punk',

  // Indie
  'indie': 'indie',
  'indie rock': 'indie',
  'indie pop': 'indie',
  'lo-fi': 'indie',
  'shoegaze': 'indie',
  'post-rock': 'indie',
  'math rock': 'indie',
  'noise pop': 'indie',

  // Soul
  'soul': 'soul',
  'motown': 'soul',
  'funk': 'soul',
  'disco': 'soul',
  'northern soul': 'soul',
  'southern soul': 'soul',
  'philly soul': 'soul',

  // Blues
  'blues': 'blues',
  'blues rock': 'blues',
  'delta blues': 'blues',
  'chicago blues': 'blues',
  'electric blues': 'blues',
  'country blues': 'blues',

  // Reggae
  'reggae': 'reggae',
  'dancehall': 'reggae',
  'dub': 'reggae',
  'ska': 'reggae',
  'roots reggae': 'reggae',

  // World
  'world': 'world',
  'world music': 'world',
  'afrobeat': 'world',
  'afrobeats': 'world',
  'afro pop': 'world',
  'celtic': 'world',
  'middle eastern': 'world',
  'african': 'world',
  'flamenco': 'world',
  'fado': 'world',
  'bollywood': 'world',
  'indian': 'world',
  'carnatic': 'world',
  'hindustani': 'world',

  // Ambient
  'ambient': 'ambient',
  'new age': 'ambient',
  'chillout': 'ambient',
  'downtempo': 'ambient',
  'meditation': 'ambient',
  'drone': 'ambient',
  'dark ambient': 'ambient',
  'space music': 'ambient',

  // K-Pop
  'k-pop': 'k-pop',
  'kpop': 'k-pop',
  'korean pop': 'k-pop',
  'korean': 'k-pop',
  'k-rock': 'k-pop',
  'k-indie': 'k-pop',
  'k-r&b': 'k-pop',

  // J-Pop
  'j-pop': 'j-pop',
  'jpop': 'j-pop',
  'japanese': 'j-pop',
  'japanese pop': 'j-pop',
  'j-rock': 'j-pop',
  'visual kei': 'j-pop',
  'city pop': 'j-pop',
  'anime': 'j-pop',
  'vocaloid': 'j-pop',

  // C-Pop
  'c-pop': 'c-pop',
  'cpop': 'c-pop',
  'mandopop': 'c-pop',
  'chinese': 'c-pop',
  'chinese pop': 'c-pop',
  'cantopop': 'c-pop',
  'cantonese': 'c-pop',
  'taiwanese': 'c-pop',
  'taiwanese pop': 'c-pop',
  'hokkien': 'c-pop',
  'mando pop': 'c-pop',
};

/**
 * Map raw external tags to our internal genre list.
 * Returns at most `maxGenres` genres, ordered by tag relevance.
 *
 * @param tags - Array of {name, count} from Last.fm or similar
 * @param maxGenres - Maximum number of genres to return (default 3)
 */
export function mapTagsToGenres(
  tags: { name: string; count: number }[],
  maxGenres = 3
): string[] {
  const genreScores = new Map<string, number>();

  for (const tag of tags) {
    const genre = TAG_TO_GENRE[tag.name];
    if (!genre) continue;

    const current = genreScores.get(genre) || 0;
    genreScores.set(genre, Math.max(current, tag.count));
  }

  return [...genreScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxGenres)
    .map(([genre]) => genre);
}
