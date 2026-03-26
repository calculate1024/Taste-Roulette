// Template-based reason generation — never copies source text

const TEMPLATES: Record<string, string[]> = {
  electronic: [
    'The production on this track rewards headphone listening',
    'A beat that builds slowly and pays off — give it the full runtime',
    'The kind of electronic track that proves machines can have soul',
    'Layered synths and textures that reveal something new each listen',
    'A sonic landscape worth getting lost in',
    'This track blurs the line between dance floor and art gallery',
    'Electronic music at its most inventive — not your typical club track',
    'The rhythm pulls you in before you realize what happened',
  ],
  rock: [
    'Raw energy from start to finish — turn it up',
    'Guitar tone and rhythm that stick with you after the first listen',
    'The kind of riff that reminds you why rock still matters',
    'A track that hits harder than you expect from the opening bars',
    'Rock that balances power with melody — not an easy trick',
    'The drums alone make this worth hearing',
    'A wall of guitars that somehow feels cathartic instead of chaotic',
    'This one sounds even better loud',
  ],
  metal: [
    'Precision and power in equal measure — this one hits hard',
    'Proof that heavy music can be intricate and beautiful',
    'A wall of sound that somehow feels controlled and deliberate',
    'Technical skill and raw emotion collide on this track',
    'Heavy without being one-dimensional — layers worth unpacking',
    'The kind of metal track that converts skeptics',
    'Intensity that demands your full attention',
    'Brutal and beautiful in the same breath',
  ],
  'hip-hop': [
    'Flow and production that complement each other perfectly',
    'A beat you can nod to for days',
    'Wordplay and rhythm that reward close listening',
    'The kind of track that sounds effortless but clearly is not',
    'Hip-hop at its most creative — pushing boundaries without losing groove',
    'A track that makes you want to rewind and catch every line',
    'Production choices that set this apart from the crowd',
    'The bassline alone is worth pressing play',
  ],
  indie: [
    'There is something about this track that feels both familiar and brand new',
    'A quiet intensity that grows on you with each replay',
    'The kind of song that soundtracks an entire season of your life',
    'Understated and unforgettable — a rare combination',
    'Indie at its best: genuine emotion without pretension',
    'A melody that lingers long after the track ends',
    'The kind of discovery that makes you explore an entire discography',
    'Simple on the surface, surprisingly deep underneath',
  ],
  jazz: [
    'Improvisation and structure in perfect tension',
    'A performance that feels like eavesdropping on genius',
    'Jazz that bridges tradition and experimentation',
    'The interplay between instruments is mesmerizing',
    'A track that rewards patience — let it unfold',
    'Sophisticated without being inaccessible',
    'The kind of jazz that makes you understand the hype',
    'Every musician in this track is having a conversation',
  ],
  classical: [
    'A performance that makes time stop',
    'The dynamics in this piece are breathtaking',
    'Classical music that speaks to modern ears',
    'A composition that balances intellect and emotion',
    'This piece has survived centuries for a reason',
    'Close your eyes and let the arrangement wash over you',
    'The orchestration reveals new details on every listen',
    'Proof that classical music can be viscerally exciting',
  ],
  folk: [
    'A story told through melody and honest lyrics',
    'The kind of folk song that feels like a campfire confession',
    'Stripped-back and powerful — no hiding behind production',
    'A voice and a melody that need nothing else',
    'Folk music that connects the past to the present',
    'Honest songwriting that cuts through the noise',
    'The simplicity is what makes this track so effective',
    'A song that earns its emotion without manipulation',
  ],
  world: [
    'A rhythm from another continent that feels instantly universal',
    'Musical traditions you have never heard — presented beautifully',
    'The kind of world music that broadens your entire perspective',
    'Cross-cultural sounds that transcend language',
    'A reminder of how vast and rich music truly is',
    'Instruments you might not recognize, feelings you definitely will',
    'Global sounds that deserve a wider audience',
    'This track takes you somewhere you have never been',
  ],
  default: [
    'One of those tracks that deserves more listeners',
    'Worth pressing play even if the name does not ring a bell',
    'A track that might push your taste in an unexpected direction',
    'The kind of song you stumble on and cannot stop replaying',
    'Give this one a chance — it might surprise you',
    'A hidden gem waiting to be discovered',
    'Music that rewards the curious listener',
    'Sometimes the best discoveries come from unexpected places',
  ],
};

// Map genre families to template keys
const GENRE_FAMILY: Record<string, string> = {
  pop: 'default',
  rock: 'rock',
  'hip-hop': 'hip-hop',
  'r&b': 'default',
  jazz: 'jazz',
  classical: 'classical',
  electronic: 'electronic',
  latin: 'world',
  country: 'folk',
  folk: 'folk',
  metal: 'metal',
  punk: 'rock',
  indie: 'indie',
  soul: 'default',
  blues: 'jazz',
  reggae: 'world',
  world: 'world',
  ambient: 'electronic',
  'k-pop': 'default',
  'j-pop': 'default',
  'c-pop': 'default',
};

const usedInBatch = new Set<string>();

/** Generate an original reason based on genre. Never copies source text. */
export function generateReason(genres: string[]): string {
  const primaryGenre = genres[0]?.toLowerCase() ?? '';
  const family = GENRE_FAMILY[primaryGenre] ?? 'default';
  const pool = TEMPLATES[family] ?? TEMPLATES.default;

  // Pick unused template if possible
  const available = pool.filter((t) => !usedInBatch.has(t));
  const candidates = available.length > 0 ? available : pool;

  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedInBatch.add(template);

  return template;
}

/** Reset used templates between sources. */
export function resetReasonBatch(): void {
  usedInBatch.clear();
}
