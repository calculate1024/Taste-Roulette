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
const SEED_PASSWORD = 'seed-simulation-2026';

// ─── Behavioral model constants ──────────────────────────────────────────
// These are NOT target KPIs — they define how simulated humans react.
// The *outputs* (actual surprise rate, retention) should emerge from the
// interaction between these behavioral rules and the matching algorithm.

// Feedback probability = f(taste_distance)
// Each row: [surprised, okay, not_for_me]
const FEEDBACK_BY_DISTANCE: Record<string, [number, number, number]> = {
  'too_close':  [0.10, 0.70, 0.20],  // dist < 0.2 — boring, no novelty
  'near':       [0.30, 0.50, 0.20],  // dist 0.2-0.35 — slightly familiar
  'sweet_low':  [0.40, 0.40, 0.20],  // dist 0.35-0.5 — good surprise zone
  'sweet_high': [0.35, 0.30, 0.35],  // dist 0.5-0.65 — exciting but risky
  'far':        [0.15, 0.25, 0.60],  // dist 0.65-0.8 — too unfamiliar
  'too_far':    [0.05, 0.15, 0.80],  // dist > 0.8 — alienating
};

function getDistanceBucket(dist: number): string {
  if (dist < 0.2)  return 'too_close';
  if (dist < 0.35) return 'near';
  if (dist < 0.5)  return 'sweet_low';
  if (dist < 0.65) return 'sweet_high';
  if (dist < 0.8)  return 'far';
  return 'too_far';
}

// Open rate model: base decays over days, modified by past experience
const BASE_OPEN_RATE_DAY1 = 0.92;
const DAILY_DECAY = 0.03;          // -3% per day natural decay
const SURPRISED_BOOST = 0.08;      // last reaction was surprised → +8%
const NOT_FOR_ME_PENALTY = 0.12;   // last reaction was not_for_me → -12%
const CONSECUTIVE_BAD_CHURN = 0.30; // 2+ consecutive not_for_me → 30% chance to skip

// Recommend-back model: correlated with satisfaction
const RECOMMEND_RATE_SURPRISED = 0.50;
const RECOMMEND_RATE_OKAY = 0.20;
const RECOMMEND_RATE_NOT_FOR_ME = 0.05;

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

/** Pick reaction based on taste distance — the core behavioral model */
function distanceDrivenReaction(tasteDistance: number): 'surprised' | 'okay' | 'not_for_me' {
  const bucket = getDistanceBucket(tasteDistance);
  const [pSurprised, pOkay] = FEEDBACK_BY_DISTANCE[bucket];
  const r = Math.random();
  if (r < pSurprised) return 'surprised';
  if (r < pSurprised + pOkay) return 'okay';
  return 'not_for_me';
}

/** Compute open probability for a user on a given day */
function computeOpenRate(day: number, lastReaction: string | null, consecutiveBad: number): number {
  let rate = BASE_OPEN_RATE_DAY1 - (day * DAILY_DECAY);

  // Experience-based modification
  if (lastReaction === 'surprised') rate += SURPRISED_BOOST;
  if (lastReaction === 'not_for_me') rate -= NOT_FOR_ME_PENALTY;

  // Churn risk: 2+ consecutive bad → chance to skip entirely
  if (consecutiveBad >= 2 && Math.random() < CONSECUTIVE_BAD_CHURN) {
    return 0; // user churned for this day
  }

  return Math.max(0.10, Math.min(0.98, rate)); // clamp between 10%-98%
}

/** Decide if user recommends back based on their reaction */
function shouldRecommendBack(reaction: string): boolean {
  if (reaction === 'surprised') return Math.random() < RECOMMEND_RATE_SURPRISED;
  if (reaction === 'okay') return Math.random() < RECOMMEND_RATE_OKAY;
  return Math.random() < RECOMMEND_RATE_NOT_FOR_ME;
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
  const INITIAL_RECOMMEND_RATE = 0.25; // 25% of users submit a rec during onboarding
  for (let i = 0; i < userIds.length; i++) {
    if (Math.random() > INITIAL_RECOMMEND_RATE) continue;

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

  // 5. Simulate 7 days of card delivery + interaction (behavioral model)
  console.log('--- Phase 3: Simulating 7 days of usage (behavioral model) ---\n');

  // Per-user state tracking
  const userState: Record<string, {
    lastReaction: string | null;
    consecutiveBad: number;
    streak: number;
    totalSurprised: number;
    totalNotForMe: number;
  }> = {};
  for (const uid of userIds) {
    userState[uid] = { lastReaction: null, consecutiveBad: 0, streak: 0, totalSurprised: 0, totalNotForMe: 0 };
  }

  let totalCards = 0;
  let totalOpened = 0;
  let totalFeedback = 0;
  let totalRecommendsFromFeedback = 0;
  const reactionCounts = { surprised: 0, okay: 0, not_for_me: 0 };
  const distanceBucketCounts: Record<string, { total: number; surprised: number; okay: number; not_for_me: number }> = {};
  for (const bucket of Object.keys(FEEDBACK_BY_DISTANCE)) {
    distanceBucketCounts[bucket] = { total: 0, surprised: 0, okay: 0, not_for_me: 0 };
  }

  for (let day = 0; day < SIMULATION_DAYS; day++) {
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() - (SIMULATION_DAYS - day - 1));
    const dayStr = dayDate.toISOString().split('T')[0];
    process.stdout.write(`Day ${day + 1} (${dayStr}): `);

    let dayCards = 0;
    let dayOpened = 0;
    let dayFeedback = 0;
    let dayChurned = 0;

    const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledUsers.length; i++) {
      const recipientId = shuffledUsers[i];
      const recipientIdx = userIds.indexOf(recipientId);
      const recipientVec = userVectors[recipientIdx];
      const state = userState[recipientId];

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

      const cardCreatedAt = new Date(dayDate);
      cardCreatedAt.setHours(8, 0, 0, 0);

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

      // ── Behavioral open decision ──
      const openRate = computeOpenRate(day, state.lastReaction, state.consecutiveBad);
      if (Math.random() < openRate) {
        const openedAt = new Date(cardCreatedAt);
        openedAt.setHours(8 + Math.floor(Math.random() * 14));

        await supabaseAdmin
          .from('roulette_cards')
          .update({ status: 'opened', opened_at: openedAt.toISOString() })
          .eq('id', card.id);

        dayOpened++;
        totalOpened++;
        state.streak++;

        // ── Behavioral feedback (driven by taste distance) ──
        if (Math.random() < 0.90) {
          const reaction = distanceDrivenReaction(tasteDist);
          reactionCounts[reaction]++;

          // Track distance bucket stats
          const bucket = getDistanceBucket(tasteDist);
          distanceBucketCounts[bucket].total++;
          distanceBucketCounts[bucket][reaction]++;

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

          // ── Update user state ──
          state.lastReaction = reaction;
          if (reaction === 'not_for_me') {
            state.consecutiveBad++;
            state.totalNotForMe++;
          } else {
            state.consecutiveBad = 0;
            if (reaction === 'surprised') state.totalSurprised++;
          }

          // ── Behavioral recommend-back (correlated with satisfaction) ──
          if (shouldRecommendBack(reaction)) {
            const recCandidates = allTracks
              .map((t) => ({ track: t, dist: cosineDistance(recipientVec, genreToVector(t.genres || [])) }))
              .filter((c) => c.dist > 0.2 && c.dist < 0.8)
              .sort(() => Math.random() - 0.5);

            const chosen = recCandidates[0];
            if (chosen) {
              const genre = chosen.track.genres?.[0] || 'music';
              await supabaseAdmin.from('user_recommendations').insert({
                user_id: recipientId,
                track_id: chosen.track.spotify_id,
                reason: pick(REASON_TEMPLATES).replace('{genre}', genre),
                used: false,
                is_curator_pick: false,
              });
              totalRecommendsFromFeedback++;
            }
          }
        }

        // Update streak in DB
        await supabaseAdmin
          .from('profiles')
          .update({ streak_count: state.streak })
          .eq('id', recipientId);
      } else {
        // User didn't open — reset streak
        state.streak = 0;
        dayChurned++;
        await supabaseAdmin
          .from('profiles')
          .update({ streak_count: 0 })
          .eq('id', recipientId);
      }
    }

    console.log(`${dayCards} cards, ${dayOpened} opened, ${dayFeedback} feedback, ${dayChurned} skipped`);
  }

  // 6. Summary with behavioral insights
  console.log('\n=== Simulation Complete ===\n');
  console.log(`Users created:       ${userIds.length}`);
  console.log(`Onboarding records:  ${userIds.length * ONBOARDING_TRACK_COUNT}`);
  console.log(`Initial recs:        ${totalRecs}`);
  console.log(`Recs from feedback:  ${totalRecommendsFromFeedback} (behavioral recommend-back)`);
  console.log(`Roulette cards:      ${totalCards}`);
  console.log(`Cards opened:        ${totalOpened} (${((totalOpened / totalCards) * 100).toFixed(0)}%)`);
  console.log(`Feedback given:      ${totalFeedback}`);
  console.log(`  surprised:         ${reactionCounts.surprised} (${((reactionCounts.surprised / totalFeedback) * 100).toFixed(0)}%)`);
  console.log(`  okay:              ${reactionCounts.okay} (${((reactionCounts.okay / totalFeedback) * 100).toFixed(0)}%)`);
  console.log(`  not_for_me:        ${reactionCounts.not_for_me} (${((reactionCounts.not_for_me / totalFeedback) * 100).toFixed(0)}%)`);

  // Distance bucket analysis — this is the key design validation
  console.log('\n--- Design Validation: Reaction by Taste Distance ---\n');
  console.log('Distance Bucket    | Total | Surprised | Okay  | Not For Me');
  console.log('-------------------|-------|-----------|-------|----------');
  for (const [bucket, counts] of Object.entries(distanceBucketCounts)) {
    if (counts.total === 0) continue;
    const pct = (n: number) => `${((n / counts.total) * 100).toFixed(0)}%`.padStart(4);
    console.log(
      `${bucket.padEnd(18)} | ${String(counts.total).padStart(5)} | ${pct(counts.surprised).padStart(9)} | ${pct(counts.okay).padStart(5)} | ${pct(counts.not_for_me).padStart(9)}`
    );
  }

  // User engagement summary
  const activeUsers = Object.values(userState).filter((s) => s.streak > 0).length;
  const churnedUsers = Object.values(userState).filter((s) => s.streak === 0 && s.totalNotForMe >= 2).length;
  const happyUsers = Object.values(userState).filter((s) => s.totalSurprised >= 2).length;

  console.log('\n--- User Engagement (Day 7 snapshot) ---\n');
  console.log(`Active (streak > 0): ${activeUsers} / ${userIds.length}`);
  console.log(`Churned (streak=0, 2+ bad): ${churnedUsers}`);
  console.log(`Happy (2+ surprises): ${happyUsers}`);
  console.log(`D7 retention rate:   ${((activeUsers / userIds.length) * 100).toFixed(0)}%`);
  console.log();
}

main().catch(console.error);
