import { TAG_TO_GENRE, mapTagsToGenres } from '../utils/tag-mapper';
import { GENRES } from '../utils/genres';

describe('TAG_TO_GENRE mapping', () => {
  it('all mapped genres exist in GENRES array', () => {
    const internalGenres = new Set(Object.values(TAG_TO_GENRE));
    for (const genre of internalGenres) {
      expect(GENRES).toContain(genre);
    }
  });

  it('maps common aliases correctly', () => {
    expect(TAG_TO_GENRE['rap']).toBe('hip-hop');
    expect(TAG_TO_GENRE['rnb']).toBe('r&b');
    expect(TAG_TO_GENRE['edm']).toBe('electronic');
    expect(TAG_TO_GENRE['kpop']).toBe('k-pop');
    expect(TAG_TO_GENRE['jpop']).toBe('j-pop');
    expect(TAG_TO_GENRE['cpop']).toBe('c-pop');
    expect(TAG_TO_GENRE['mandopop']).toBe('c-pop');
    expect(TAG_TO_GENRE['cantopop']).toBe('c-pop');
  });

  it('maps subgenres to parent genres', () => {
    expect(TAG_TO_GENRE['death metal']).toBe('metal');
    expect(TAG_TO_GENRE['post-punk']).toBe('punk');
    expect(TAG_TO_GENRE['deep house']).toBe('electronic');
    expect(TAG_TO_GENRE['bossa nova']).toBe('jazz');
    expect(TAG_TO_GENRE['indie folk']).toBe('folk');
    expect(TAG_TO_GENRE['trap']).toBe('hip-hop');
    expect(TAG_TO_GENRE['shoegaze']).toBe('indie');
    expect(TAG_TO_GENRE['delta blues']).toBe('blues');
    expect(TAG_TO_GENRE['dancehall']).toBe('reggae');
  });

  it('maps ambiguous tags correctly (dream pop → indie, not pop)', () => {
    expect(TAG_TO_GENRE['dream pop']).toBe('indie');
  });

  it('maps britpop to rock, not pop', () => {
    expect(TAG_TO_GENRE['britpop']).toBe('rock');
  });

  it('handles all Asian pop variants', () => {
    expect(TAG_TO_GENRE['korean']).toBe('k-pop');
    expect(TAG_TO_GENRE['japanese']).toBe('j-pop');
    expect(TAG_TO_GENRE['chinese']).toBe('c-pop');
    expect(TAG_TO_GENRE['taiwanese']).toBe('c-pop');
    expect(TAG_TO_GENRE['hokkien']).toBe('c-pop');
    expect(TAG_TO_GENRE['city pop']).toBe('j-pop');
    expect(TAG_TO_GENRE['anime']).toBe('j-pop');
    expect(TAG_TO_GENRE['vocaloid']).toBe('j-pop');
  });

  it('covers all 21 internal genres as mapping targets', () => {
    const mappedGenres = new Set(Object.values(TAG_TO_GENRE));
    for (const genre of GENRES) {
      expect(mappedGenres).toContain(genre);
    }
  });
});

describe('mapTagsToGenres', () => {
  it('returns empty array for empty tags', () => {
    expect(mapTagsToGenres([])).toEqual([]);
  });

  it('returns empty array when no tags match', () => {
    const tags = [
      { name: 'zzz-unknown', count: 100 },
      { name: 'xyz-noise', count: 50 },
    ];
    expect(mapTagsToGenres(tags)).toEqual([]);
  });

  it('maps single known tag', () => {
    const tags = [{ name: 'rock', count: 100 }];
    expect(mapTagsToGenres(tags)).toEqual(['rock']);
  });

  it('maps multiple tags to distinct genres', () => {
    const tags = [
      { name: 'alternative rock', count: 100 },
      { name: 'indie', count: 80 },
      { name: 'shoegaze', count: 60 },
    ];
    const result = mapTagsToGenres(tags);
    // alternative rock → rock, indie → indie, shoegaze → indie
    // rock should come first (highest count), then indie
    expect(result[0]).toBe('rock');
    expect(result).toContain('indie');
  });

  it('orders by tag count (highest relevance first)', () => {
    const tags = [
      { name: 'jazz', count: 30 },
      { name: 'pop', count: 90 },
      { name: 'rock', count: 60 },
    ];
    const result = mapTagsToGenres(tags);
    expect(result).toEqual(['pop', 'rock', 'jazz']);
  });

  it('deduplicates: multiple tags mapping to same genre keep highest count', () => {
    const tags = [
      { name: 'rap', count: 80 },
      { name: 'hip hop', count: 100 },
      { name: 'trap', count: 50 },
    ];
    const result = mapTagsToGenres(tags);
    // All map to hip-hop, should return single entry
    expect(result).toEqual(['hip-hop']);
  });

  it('respects maxGenres limit', () => {
    const tags = [
      { name: 'pop', count: 100 },
      { name: 'rock', count: 90 },
      { name: 'jazz', count: 80 },
      { name: 'metal', count: 70 },
      { name: 'blues', count: 60 },
    ];
    expect(mapTagsToGenres(tags, 2)).toHaveLength(2);
    expect(mapTagsToGenres(tags, 1)).toEqual(['pop']);
  });

  it('defaults maxGenres to 3', () => {
    const tags = GENRES.map((g, i) => ({ name: g, count: 100 - i }));
    expect(mapTagsToGenres(tags)).toHaveLength(3);
  });

  it('ignores unknown tags mixed with known ones', () => {
    const tags = [
      { name: 'completely-unknown-genre', count: 100 },
      { name: 'pop', count: 50 },
      { name: 'another-unknown', count: 90 },
    ];
    expect(mapTagsToGenres(tags)).toEqual(['pop']);
  });

  it('handles real-world Last.fm tag response pattern', () => {
    // Simulated Last.fm response for The Weeknd
    const tags = [
      { name: 'pop', count: 100 },
      { name: 'rnb', count: 85 },
      { name: 'canadian', count: 60 },    // No mapping
      { name: 'synthpop', count: 55 },     // → pop (already counted)
      { name: 'electronic', count: 40 },
      { name: 'male vocalists', count: 30 }, // No mapping
    ];
    const result = mapTagsToGenres(tags);
    expect(result).toContain('pop');
    expect(result).toContain('r&b');
    expect(result).toContain('electronic');
  });

  it('handles zero count tags', () => {
    const tags = [
      { name: 'rock', count: 0 },
      { name: 'pop', count: 100 },
    ];
    const result = mapTagsToGenres(tags);
    // Both valid, pop first by count
    expect(result[0]).toBe('pop');
    expect(result).toContain('rock');
  });
});
