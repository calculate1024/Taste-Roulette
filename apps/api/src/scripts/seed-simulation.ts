// Seed 100 AI users and simulate 7 days of realistic app usage.
// Generates onboarding responses, daily card interactions, feedback, and recommendations.
//
// Usage: npx tsx src/scripts/seed-simulation.ts
//
// Prerequisites:
// - Seed tracks loaded first (npm run seed / npm run seed:expand)
// - Supabase must be running with all migrations applied (including 008_seed_flag)

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { supabaseAdmin } from '../services/supabase';
import { GENRES, VECTOR_DIM, genreToVector } from '../utils/genres';

// ─── Config ───────────────────────────────────────────────────────────────

const TOTAL_USERS = 100;
const ONBOARDING_TRACK_COUNT = 15;
const SIMULATION_DAYS = 7;
const RECOMMEND_BACK_RATE = 0.30;
const CARD_OPEN_RATE = 0.85;
const SEED_PASSWORD = 'seed-simulation-2026';

// Feedback distribution (matches KPI targets)
const FEEDBACK_DIST = { surprised: 0.25, okay: 0.50, not_for_me: 0.25 };

// ─── Persona generation ──────────────────────────────────────────────────

const PERSONA_ADJECTIVES = [
  'Dreamy', 'Electric', 'Cosmic', 'Velvet', 'Golden', 'Midnight', 'Crystal',
  'Neon', 'Solar', 'Lunar', 'Mystic', 'Urban', 'Analog', 'Digital', 'Vintage',
  'Sonic', 'Stellar', 'Quantum', 'Pacific', 'Arctic', 'Ember', 'Thunder',
  'Silk', 'Crimson', 'Azure', 'Ivory', 'Copper', 'Silver', 'Jade', 'Coral',
];

const PERSONA_NOUNS = [
  'Explorer', 'Wanderer', 'Architect', 'Dreamer', 'Spirit', 'Soul', 'Mind',
  'Heart', 'Voyager', 'Pioneer', 'Seeker', 'Drifter', 'Nomad', 'Phoenix',
  'Rebel', 'Sage', 'Muse', 'Echo', 'Pulse', 'Wave', 'Frequency', 'Rhythm',
  'Groove', 'Melody', 'Harmony', 'Resonance', 'Vibe', 'Flow', 'Aura', 'Spark',
];

const REASON_TEMPLATES = [
  'This track changed how I think about {genre} — give it a real listen',
  'Put this on at sunset and thank me later',
  "If you think you don't like {genre}, this song will change your mind",
  'The production on this is insane, every layer reveals something new',
  'Found this at 2am and couldn\'t stop replaying it',
  'The way the vocals float over the beat is pure magic',
  'This deserves way more attention than it gets',
  'One of those songs that sounds better every time you hear it',
  'The bridge hits different — wait for it',
  'Perfect for a long drive with the windows down',
  'This artist deserves to blow up, seriously talented',
  'The mood shift halfway through is genius',
  "I've played this 50+ times and I'm still not tired of it",
  'Close your eyes and let this one wash over you',
  'The bassline alone makes this worth the listen',
  'Unexpected genre blend that somehow works perfectly',
  'This track has a texture I\'ve never heard before',
  'My most played song this month, no contest',
  'The energy in this is contagious — impossible to sit still',
  'Stripped back and raw — no tricks, just pure emotion',
  'The kind of song that makes you discover a whole new genre',
  'Trust me on this one, it grows on you fast',
  'Play it loud — the details disappear on low volume',
  'This is what happens when artists take real creative risks',
];

const FEEDBACK_COMMENTS: Record<string, string[]> = {
  surprised: [
    'Wow, never would have found this on my own!',
    'This is exactly the kind of surprise I signed up for',
    'Added to my playlist immediately',
    'My taste just expanded a little today',
    'Didn\'t expect to like this genre but here we are',
    'The recommendation was spot on — different but not alienating',
  ],
  okay: [
    'Interesting, not my usual but I can see the appeal',
    'Decent track, might grow on me',
    'Not bad! The production is clean',
    'Solid recommendation, just not in love with it',
  ],
  not_for_me: [
    'Appreciate the suggestion but this one\'s not clicking',
    'Too far from my comfort zone for now',
    'I can see why someone would like this, just not for me',
  ],
};

/** Pick a weighted random reaction */
function weightedReaction(): 'surprised' | 'okay' | 'not_for_me' {
  const r = Math.random();
  if (r < FEEDBACK_DIST.surprised) return 'surprised';
  if (r < FEEDBACK_DIST.surprised + FEEDBACK_DIST.okay) return 'okay';
  return 'not_for_me';
}

/** Pick onboarding reaction based on genre match */
function onboardingReaction(trackGenres: string[], userGenres: string[]): 'love' | 'okay' | 'not_for_me' {
  const overlap = trackGenres.some((g) => userGenres.includes(g));
  const r = Math.random();
  if (overlap) {
    if (r < 0.80) return 'love';
    if (r < 0.95) return 'okay';
    return 'not_for_me';
  } else {
    if (r < 0.10) return 'love';
    if (r < 0.40) return 'okay';
    return 'not_for_me';
  }
}

/** Pick random element from array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build taste vector from dominant genres (same as seed-users.ts) */
function buildTasteVector(dominantGenres: string[]): number[] {
  const vec = new Array(VECTOR_DIM).fill(0);
  for (const genre of dominantGenres) {
    const oneHot = genreToVector([genre]);
    for (let i = 0; i < VECTOR_DIM; i++) {
      vec[i] = Math.max(vec[i], oneHot[i]);
    }
  }
  return vec;
}

/** Generate N diverse user personas with balanced genre coverage */
function generatePersonas(count: number) {
  const personas: { email: string; displayName: string; dominantGenres: string[] }[] = [];

  // Ensure every genre appears at least ceil(count / GENRES.length) times
  const genrePool: string[] = [];
  const minPerGenre = Math.ceil((count * 3) / GENRES.length); // avg 3 genres per user
  for (const g of GENRES) {
    for (let i = 0; i < minPerGenre; i++) genrePool.push(g);
  }

  // Shuffle
  for (let i = genrePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [genrePool[i], genrePool[j]] = [genrePool[j], genrePool[i]];
  }

  let poolIdx = 0;
  for (let i = 0; i < count; i++) {
    const numGenres = 2 + Math.floor(Math.random() * 3); // 2-4 genres
    const genres = new Set<string>();
    while (genres.size < numGenres) {
      if (poolIdx < genrePool.length) {
        genres.add(genrePool[poolIdx++]);
      } else {
        genres.add(pick(GENRES));
      }
    }

    const adj = PERSONA_ADJECTIVES[i % PERSONA_ADJECTIVES.length];
    const noun = PERSONA_NOUNS[Math.floor(i / PERSONA_ADJECTIVES.length) % PERSONA_NOUNS.length];
    const displayName = `${adj} ${noun}`;

    personas.push({
      email: `seed-sim-${String(i + 1).padStart(3, '0')}@taste-roulette.local`,
      displayName,
      dominantGenres: [...genres],
    });
  }

  return personas;
}

/** Compute cosine distance between two vectors */
function cosineDistance(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 1;
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Main simulation ─────────────────────────────────────────────────────

async function main() {
  console.log('=== Taste Roulette Seed Simulation ===\n');

  // 1. Fetch available tracks for onboarding and recommendations
  const { data: allTracks, error: tracksError } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id, title, artist, genres, popularity')
    .order('popularity', { ascending: false });

  if (tracksError || !allTracks?.length) {
    console.error('ERROR: No tracks found. Run "npm run seed" first.');
    process.exit(1);
  }
  console.log(`Found ${allTracks.length} tracks in database\n`);

  const onboardingTracks = allTracks.slice(0, Math.min(50, allTracks.length));

  // 2. Generate personas
  const personas = generatePersonas(TOTAL_USERS);
  console.log(`Generated ${personas.length} personas\n`);

  // Genre coverage check
  const genreCounts: Record<string, number> = {};
  for (const p of personas) {
    for (const g of p.dominantGenres) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }
  console.log('Genre coverage:');
  for (const g of GENRES) {
    console.log(`  ${g}: ${genreCounts[g] || 0} users`);
  }
  console.log();

  // 3. Create users and simulate onboarding
  const userIds: string[] = [];
  const userVectors: number[][] = [];

  console.log('--- Phase 1: Creating users + onboarding ---\n');

  for (let i = 0; i < personas.length; i++) {
    const p = personas[i];
    process.stdout.write(`[${i + 1}/${personas.length}] ${p.displayName}... `);

    // Create or find auth user
    let userId: string;
    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('display_name', p.displayName)
      .limit(1);

    if (existingUsers?.length) {
      userId = existingUsers[0].id;
      console.log('exists, skipping creation');
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: p.email,
        password: SEED_PASSWORD,
        email_confirm: true,
      });

      if (authError) {
        // Try to find existing auth user
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
        const existing = users?.find((u: any) => u.email === p.email);
        if (existing) {
          userId = existing.id;
        } else {
          console.log(`SKIP (${authError.message})`);
          continue;
        }
      } else {
        userId = authData.user.id;
      }
      console.log('created');
    }

    userIds.push(userId);

    // Compute taste vector
    const tasteVector = buildTasteVector(p.dominantGenres);
    userVectors.push(tasteVector);

    // Upsert profile
    // Note: is_seed column requires migration 008. If not applied yet,
    // seed users can be identified by email pattern: seed-sim-*@taste-roulette.local
    const profileData: Record<string, unknown> = {
      id: userId,
      display_name: p.displayName,
      taste_vector: tasteVector,
      onboarding_completed: true,
      streak_count: 0,
    };

    // Try to set is_seed if column exists (graceful degradation)
    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert(
      { ...profileData, is_seed: true },
      { onConflict: 'id' },
    );
    if (upsertError?.message?.includes('is_seed')) {
      // Column doesn't exist yet — upsert without it
      await supabaseAdmin.from('profiles').upsert(profileData, { onConflict: 'id' });
    }

    // Simulate onboarding responses (15 random tracks from pool)
    const shuffled = [...onboardingTracks].sort(() => Math.random() - 0.5);
    const selectedTracks = shuffled.slice(0, ONBOARDING_TRACK_COUNT);

    const responses = selectedTracks.map((t) => ({
      user_id: userId,
      track_id: t.spotify_id,
      reaction: onboardingReaction(t.genres || [], p.dominantGenres),
    }));

    // Delete existing responses for idempotency
    await supabaseAdmin.from('onboarding_responses').delete().eq('user_id', userId);
    await supabaseAdmin.from('onboarding_responses').insert(responses);
  }

  console.log(`\nCreated ${userIds.length} users with onboarding data\n`);

  // 4. Simulate recommendations (~30% of users)
  console.log('--- Phase 2: Simulating recommendations ---\n');

  let totalRecs = 0;
  for (let i = 0; i < userIds.length; i++) {
    if (Math.random() > RECOMMEND_BACK_RATE) continue;

    const userId = userIds[i];
    const userVec = userVectors[i];
    const numRecs = 1 + Math.floor(Math.random() * 3); // 1-3 recommendations

    for (let r = 0; r < numRecs; r++) {
      // Pick a track with moderate distance from user's taste
      const candidates = allTracks
        .map((t) => {
          const trackVec = genreToVector(t.genres || []);
          const dist = cosineDistance(userVec, trackVec);
          return { track: t, dist };
        })
        .filter((c) => c.dist > 0.2 && c.dist < 0.8)
        .sort(() => Math.random() - 0.5);

      const chosen = candidates[0];
      if (!chosen) continue;

      const genre = chosen.track.genres?.[0] || 'music';
      const reason = pick(REASON_TEMPLATES).replace('{genre}', genre);

      await supabaseAdmin.from('user_recommendations').insert({
        user_id: userId,
        track_id: chosen.track.spotify_id,
        reason,
        used: false,
        is_curator_pick: false,
      });
      totalRecs++;
    }
  }
  console.log(`Inserted ${totalRecs} user recommendations\n`);

  // 5. Simulate 7 days of card delivery + interaction
  console.log('--- Phase 3: Simulating 7 days of usage ---\n');

  let totalCards = 0;
  let totalOpened = 0;
  let totalFeedback = 0;
  const reactionCounts = { surprised: 0, okay: 0, not_for_me: 0 };

  for (let day = 0; day < SIMULATION_DAYS; day++) {
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() - (SIMULATION_DAYS - day - 1));
    const dayStr = dayDate.toISOString().split('T')[0];
    process.stdout.write(`Day ${day + 1} (${dayStr}): `);

    let dayCards = 0;
    let dayOpened = 0;
    let dayFeedback = 0;

    // Pair users for this day (simple random pairing from recommendation pool or curator fallback)
    const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledUsers.length; i++) {
      const recipientId = shuffledUsers[i];
      const recipientVec = userVectors[userIds.indexOf(recipientId)];

      // Find a recommender with moderate taste distance
      let recommenderId: string | null = null;
      let trackId: string | null = null;
      let reason = '';
      let tasteDist = 0.5;
      let tasteLabel = 'music lover';

      // Try to find a user recommendation from another user
      const { data: availableRec } = await supabaseAdmin
        .from('user_recommendations')
        .select('user_id, track_id, reason')
        .eq('used', false)
        .neq('user_id', recipientId)
        .limit(1);

      if (availableRec?.length) {
        const rec = availableRec[0];
        recommenderId = rec.user_id;
        trackId = rec.track_id;
        reason = rec.reason;

        const recIdx = userIds.indexOf(recommenderId);
        if (recIdx >= 0) {
          tasteDist = cosineDistance(recipientVec, userVectors[recIdx]);
        }

        // Mark as used
        await supabaseAdmin
          .from('user_recommendations')
          .update({ used: true })
          .eq('user_id', rec.user_id)
          .eq('track_id', rec.track_id);
      } else {
        // Curator fallback — pick a random track with moderate distance
        const candidates = allTracks
          .map((t) => ({
            track: t,
            dist: cosineDistance(recipientVec, genreToVector(t.genres || [])),
          }))
          .filter((c) => c.dist >= 0.3 && c.dist <= 0.7)
          .sort((a, b) => Math.abs(a.dist - 0.5) - Math.abs(b.dist - 0.5));

        const chosen = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
        if (!chosen) continue;

        trackId = chosen.track.spotify_id;
        tasteDist = chosen.dist;
        const genre = chosen.track.genres?.[0] || 'music';
        reason = pick(REASON_TEMPLATES).replace('{genre}', genre);
      }

      if (!trackId) continue;

      // Insert roulette card
      const cardCreatedAt = new Date(dayDate);
      cardCreatedAt.setHours(8, 0, 0, 0); // 8am delivery

      const { data: card, error: cardError } = await supabaseAdmin
        .from('roulette_cards')
        .insert({
          recipient_id: recipientId,
          recommender_id: recommenderId,
          track_id: trackId,
          reason,
          taste_distance: tasteDist,
          recommender_taste_label: tasteLabel,
          status: 'pending',
          delivered_at: cardCreatedAt.toISOString(),
          created_at: cardCreatedAt.toISOString(),
        })
        .select('id')
        .single();

      if (cardError || !card) continue;
      dayCards++;
      totalCards++;

      // Simulate open (~85%)
      if (Math.random() < CARD_OPEN_RATE) {
        const openedAt = new Date(cardCreatedAt);
        openedAt.setHours(8 + Math.floor(Math.random() * 14)); // open between 8am-10pm

        await supabaseAdmin
          .from('roulette_cards')
          .update({ status: 'opened', opened_at: openedAt.toISOString() })
          .eq('id', card.id);

        dayOpened++;
        totalOpened++;

        // Simulate feedback (~90% of openers give feedback)
        if (Math.random() < 0.90) {
          const reaction = weightedReaction();
          reactionCounts[reaction]++;

          const comment = Math.random() < 0.3 ? pick(FEEDBACK_COMMENTS[reaction]) : null;

          await supabaseAdmin.from('feedbacks').insert({
            card_id: card.id,
            user_id: recipientId,
            reaction,
            comment,
            created_at: openedAt.toISOString(),
          });

          await supabaseAdmin
            .from('roulette_cards')
            .update({ status: 'feedback_given' })
            .eq('id', card.id);

          dayFeedback++;
          totalFeedback++;
        }

        // Update streak
        await supabaseAdmin
          .from('profiles')
          .update({ streak_count: day + 1 })
          .eq('id', recipientId);
      }
    }

    console.log(`${dayCards} cards, ${dayOpened} opened, ${dayFeedback} feedback`);
  }

  // 6. Summary
  console.log('\n=== Simulation Complete ===\n');
  console.log(`Users created:       ${userIds.length}`);
  console.log(`Onboarding records:  ${userIds.length * ONBOARDING_TRACK_COUNT}`);
  console.log(`Recommendations:     ${totalRecs}`);
  console.log(`Roulette cards:      ${totalCards}`);
  console.log(`Cards opened:        ${totalOpened} (${((totalOpened / totalCards) * 100).toFixed(0)}%)`);
  console.log(`Feedback given:      ${totalFeedback}`);
  console.log(`  surprised:         ${reactionCounts.surprised} (${((reactionCounts.surprised / totalFeedback) * 100).toFixed(0)}%)`);
  console.log(`  okay:              ${reactionCounts.okay} (${((reactionCounts.okay / totalFeedback) * 100).toFixed(0)}%)`);
  console.log(`  not_for_me:        ${reactionCounts.not_for_me} (${((reactionCounts.not_for_me / totalFeedback) * 100).toFixed(0)}%)`);
  console.log();
}

main().catch(console.error);
