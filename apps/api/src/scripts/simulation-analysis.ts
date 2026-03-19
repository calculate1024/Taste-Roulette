// Pure in-memory simulation for design validation.
// Does NOT write to Supabase — runs fast, repeatable, multi-scenario.
//
// Usage: npx tsx src/scripts/simulation-analysis.ts
//
// Scenarios tested:
// A) Current design: matching filter 0.3-0.7
// B) Full range: no distance filter (validates sweet spot boundaries)
// C) Tighter sweet spot: matching filter 0.3-0.55
// D) Cold start: 10 users, curator-only for first 3 days

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { supabaseAdmin } from '../services/supabase';
import { GENRES, VECTOR_DIM, genreToVector } from '../utils/genres';

// ─── Behavioral model (same as seed-simulation.ts) ───────────────────────

const FEEDBACK_BY_DISTANCE: Record<string, [number, number, number]> = {
  'too_close':  [0.10, 0.70, 0.20],
  'near':       [0.30, 0.50, 0.20],
  'sweet_low':  [0.40, 0.40, 0.20],
  'sweet_high': [0.35, 0.30, 0.35],
  'far':        [0.15, 0.25, 0.60],
  'too_far':    [0.05, 0.15, 0.80],
};

function getDistanceBucket(dist: number): string {
  if (dist < 0.2)  return 'too_close';
  if (dist < 0.35) return 'near';
  if (dist < 0.5)  return 'sweet_low';
  if (dist < 0.65) return 'sweet_high';
  if (dist < 0.8)  return 'far';
  return 'too_far';
}

const BASE_OPEN_RATE_DAY1 = 0.92;
const DAILY_DECAY = 0.03;
const SURPRISED_BOOST = 0.08;
const NOT_FOR_ME_PENALTY = 0.12;
const CONSECUTIVE_BAD_CHURN = 0.30;
const GENRE_REPEAT_PENALTY = 0.15; // NEW: same genre 2 days in a row

function distanceDrivenReaction(dist: number): 'surprised' | 'okay' | 'not_for_me' {
  const bucket = getDistanceBucket(dist);
  const [pS, pO] = FEEDBACK_BY_DISTANCE[bucket];
  const r = Math.random();
  if (r < pS) return 'surprised';
  if (r < pS + pO) return 'okay';
  return 'not_for_me';
}

function computeOpenRate(day: number, lastReaction: string | null, consecutiveBad: number): number {
  let rate = BASE_OPEN_RATE_DAY1 - (day * DAILY_DECAY);
  if (lastReaction === 'surprised') rate += SURPRISED_BOOST;
  if (lastReaction === 'not_for_me') rate -= NOT_FOR_ME_PENALTY;
  if (consecutiveBad >= 2 && Math.random() < CONSECUTIVE_BAD_CHURN) return 0;
  return Math.max(0.10, Math.min(0.98, rate));
}

// ─── In-memory data structures ───────────────────────────────────────────

interface TrackData {
  id: string;
  genres: string[];
  vec: number[];
}

interface Persona {
  id: number;
  dominantGenres: string[];
  vec: number[];
}

interface UserState {
  lastReaction: string | null;
  lastGenre: string | null; // NEW: for genre repeat tracking
  consecutiveBad: number;
  streak: number;
  totalSurprised: number;
  totalNotForMe: number;
  totalOkay: number;
}

interface DayStats {
  cards: number;
  opened: number;
  feedback: number;
  skipped: number;
}

interface BucketStats {
  total: number;
  surprised: number;
  okay: number;
  not_for_me: number;
}

interface RunResult {
  totalCards: number;
  totalOpened: number;
  totalFeedback: number;
  recsFromFeedback: number;
  reactions: { surprised: number; okay: number; not_for_me: number };
  buckets: Record<string, BucketStats>;
  dayStats: DayStats[];
  activeD7: number;
  churned: number;
  happy: number;
  userCount: number;
}

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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildTasteVector(genres: string[]): number[] {
  const vec = new Array(VECTOR_DIM).fill(0);
  for (const g of genres) {
    const oneHot = genreToVector([g]);
    for (let i = 0; i < VECTOR_DIM; i++) vec[i] = Math.max(vec[i], oneHot[i]);
  }
  return vec;
}

// ─── Persona generation ──────────────────────────────────────────────────

function generatePersonas(count: number): Persona[] {
  const personas: Persona[] = [];
  const genrePool: string[] = [];
  const minPerGenre = Math.ceil((count * 3) / GENRES.length);
  for (const g of GENRES) {
    for (let i = 0; i < minPerGenre; i++) genrePool.push(g);
  }
  for (let i = genrePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [genrePool[i], genrePool[j]] = [genrePool[j], genrePool[i]];
  }

  let poolIdx = 0;
  for (let i = 0; i < count; i++) {
    const numGenres = 2 + Math.floor(Math.random() * 3);
    const genres = new Set<string>();
    while (genres.size < numGenres) {
      if (poolIdx < genrePool.length) genres.add(genrePool[poolIdx++]);
      else genres.add(pick(GENRES));
    }
    const dominantGenres = [...genres];
    personas.push({ id: i, dominantGenres, vec: buildTasteVector(dominantGenres) });
  }
  return personas;
}

// ─── Core simulation engine ──────────────────────────────────────────────

interface ScenarioConfig {
  name: string;
  userCount: number;
  days: number;
  // Matching filter: min/max taste distance for curator fallback
  matchMinDist: number;
  matchMaxDist: number;
  // Center preference for distance sorting (default 0.5)
  matchCenter: number;
  // Hard cap on user rec distance (default: no cap = 1.0)
  userRecDistCap: number;
  // Whether user recs are available (false = curator-only)
  userRecsEnabled: boolean;
  // Genre repeat penalty enabled
  genreRepeatPenalty: boolean;
}

function runSimulation(
  config: ScenarioConfig,
  tracks: TrackData[],
  personas: Persona[],
): RunResult {
  const users = personas.slice(0, config.userCount);

  // Initialize user state
  const states: UserState[] = users.map(() => ({
    lastReaction: null,
    lastGenre: null,
    consecutiveBad: 0,
    streak: 0,
    totalSurprised: 0,
    totalNotForMe: 0,
    totalOkay: 0,
  }));

  // Recommendation pool (simple: each user contributes 1-2 at start)
  const recPool: { fromUser: number; trackIdx: number }[] = [];
  if (config.userRecsEnabled) {
    for (let i = 0; i < users.length; i++) {
      if (Math.random() > 0.25) continue;
      const numRecs = 1 + Math.floor(Math.random() * 2);
      for (let r = 0; r < numRecs; r++) {
        const candidates = tracks
          .map((t, idx) => ({ idx, dist: cosineDistance(users[i].vec, t.vec) }))
          .filter((c) => c.dist > 0.2 && c.dist < 0.8);
        if (candidates.length > 0) {
          recPool.push({ fromUser: i, trackIdx: pick(candidates).idx });
        }
      }
    }
  }

  let totalCards = 0, totalOpened = 0, totalFeedback = 0, recsFromFeedback = 0;
  const reactions = { surprised: 0, okay: 0, not_for_me: 0 };
  const buckets: Record<string, BucketStats> = {};
  for (const b of Object.keys(FEEDBACK_BY_DISTANCE)) {
    buckets[b] = { total: 0, surprised: 0, okay: 0, not_for_me: 0 };
  }
  const dayStats: DayStats[] = [];

  for (let day = 0; day < config.days; day++) {
    let dayCards = 0, dayOpened = 0, dayFeedback = 0, daySkipped = 0;

    // Shuffle user order each day
    const order = [...users.keys()].sort(() => Math.random() - 0.5);

    for (const userIdx of order) {
      const user = users[userIdx];
      const state = states[userIdx];

      // ── Match: find a track for this user ──
      let tasteDist = 0.5;
      let trackGenre = '';

      // Try user rec pool first
      let matched = false;
      if (config.userRecsEnabled && recPool.length > 0) {
        // Find a rec from someone else, respecting distance cap
        const recIdx = recPool.findIndex((r) => {
          if (r.fromUser === userIdx) return false;
          const d = cosineDistance(user.vec, tracks[r.trackIdx].vec);
          return d <= config.userRecDistCap;
        });
        if (recIdx >= 0) {
          const rec = recPool.splice(recIdx, 1)[0];
          const track = tracks[rec.trackIdx];
          tasteDist = cosineDistance(user.vec, tracks[rec.trackIdx].vec);
          trackGenre = track.genres[0] || '';
          matched = true;
        }
      }

      if (!matched) {
        // Curator fallback with configurable distance filter
        const candidates = tracks
          .map((t) => ({ track: t, dist: cosineDistance(user.vec, t.vec) }))
          .filter((c) => c.dist >= config.matchMinDist && c.dist <= config.matchMaxDist)
          .sort((a, b) => Math.abs(a.dist - config.matchCenter) - Math.abs(b.dist - config.matchCenter));

        if (candidates.length === 0) {
          // No match possible — pick anything
          const fallback = tracks[Math.floor(Math.random() * tracks.length)];
          tasteDist = cosineDistance(user.vec, fallback.vec);
          trackGenre = fallback.genres[0] || '';
        } else {
          const chosen = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
          tasteDist = chosen.dist;
          trackGenre = chosen.track.genres[0] || '';
        }
      }

      dayCards++;
      totalCards++;

      // ── Open decision (behavioral) ──
      const openRate = computeOpenRate(day, state.lastReaction, state.consecutiveBad);
      if (Math.random() >= openRate) {
        state.streak = 0;
        daySkipped++;
        continue;
      }

      dayOpened++;
      totalOpened++;
      state.streak++;

      // ── Feedback (90% of openers) ──
      if (Math.random() >= 0.90) continue;

      let reaction = distanceDrivenReaction(tasteDist);

      // ── Genre repeat penalty ──
      if (config.genreRepeatPenalty && trackGenre && trackGenre === state.lastGenre) {
        // Same genre as yesterday → boost not_for_me probability
        if (reaction === 'surprised' && Math.random() < GENRE_REPEAT_PENALTY) {
          reaction = 'okay'; // downgrade surprise to okay
        }
        if (reaction === 'okay' && Math.random() < GENRE_REPEAT_PENALTY) {
          reaction = 'not_for_me'; // downgrade okay to not_for_me
        }
      }

      reactions[reaction]++;
      const bucket = getDistanceBucket(tasteDist);
      buckets[bucket].total++;
      buckets[bucket][reaction]++;

      dayFeedback++;
      totalFeedback++;

      // Update state
      state.lastReaction = reaction;
      state.lastGenre = trackGenre;
      if (reaction === 'not_for_me') {
        state.consecutiveBad++;
        state.totalNotForMe++;
      } else {
        state.consecutiveBad = 0;
        if (reaction === 'surprised') state.totalSurprised++;
        if (reaction === 'okay') state.totalOkay++;
      }

      // Behavioral recommend-back
      const recRate = reaction === 'surprised' ? 0.50 : reaction === 'okay' ? 0.20 : 0.05;
      if (Math.random() < recRate) {
        const c = tracks
          .map((t, idx) => ({ idx, dist: cosineDistance(user.vec, t.vec) }))
          .filter((c) => c.dist > 0.2 && c.dist < 0.8);
        if (c.length > 0) {
          recPool.push({ fromUser: userIdx, trackIdx: pick(c).idx });
          recsFromFeedback++;
        }
      }
    }

    dayStats.push({ cards: dayCards, opened: dayOpened, feedback: dayFeedback, skipped: daySkipped });
  }

  const activeD7 = states.filter((s) => s.streak > 0).length;
  const churned = states.filter((s) => s.streak === 0 && s.totalNotForMe >= 2).length;
  const happy = states.filter((s) => s.totalSurprised >= 2).length;

  return {
    totalCards, totalOpened, totalFeedback, recsFromFeedback,
    reactions, buckets, dayStats,
    activeD7, churned, happy, userCount: users.length,
  };
}

// ─── Multi-run averaging ─────────────────────────────────────────────────

function averageResults(results: RunResult[]): RunResult {
  const n = results.length;
  const avg = (fn: (r: RunResult) => number) => Math.round(results.reduce((s, r) => s + fn(r), 0) / n);

  // Average bucket stats
  const allBucketKeys = Object.keys(FEEDBACK_BY_DISTANCE);
  const avgBuckets: Record<string, BucketStats> = {};
  for (const b of allBucketKeys) {
    avgBuckets[b] = {
      total: avg((r) => r.buckets[b]?.total || 0),
      surprised: avg((r) => r.buckets[b]?.surprised || 0),
      okay: avg((r) => r.buckets[b]?.okay || 0),
      not_for_me: avg((r) => r.buckets[b]?.not_for_me || 0),
    };
  }

  // Average day stats
  const days = results[0].dayStats.length;
  const avgDays: DayStats[] = [];
  for (let d = 0; d < days; d++) {
    avgDays.push({
      cards: avg((r) => r.dayStats[d]?.cards || 0),
      opened: avg((r) => r.dayStats[d]?.opened || 0),
      feedback: avg((r) => r.dayStats[d]?.feedback || 0),
      skipped: avg((r) => r.dayStats[d]?.skipped || 0),
    });
  }

  return {
    totalCards: avg((r) => r.totalCards),
    totalOpened: avg((r) => r.totalOpened),
    totalFeedback: avg((r) => r.totalFeedback),
    recsFromFeedback: avg((r) => r.recsFromFeedback),
    reactions: {
      surprised: avg((r) => r.reactions.surprised),
      okay: avg((r) => r.reactions.okay),
      not_for_me: avg((r) => r.reactions.not_for_me),
    },
    buckets: avgBuckets,
    dayStats: avgDays,
    activeD7: avg((r) => r.activeD7),
    churned: avg((r) => r.churned),
    happy: avg((r) => r.happy),
    userCount: results[0].userCount,
  };
}

// ─── Reporting ───────────────────────────────────────────────────────────

function printResult(label: string, r: RunResult) {
  const pct = (n: number, d: number) => d > 0 ? `${((n / d) * 100).toFixed(0)}%` : 'N/A';

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'═'.repeat(60)}`);

  console.log(`\nUsers: ${r.userCount} | Cards: ${r.totalCards} | Opened: ${r.totalOpened} (${pct(r.totalOpened, r.totalCards)}) | Feedback: ${r.totalFeedback}`);
  console.log(`Reactions: surprised ${pct(r.reactions.surprised, r.totalFeedback)} | okay ${pct(r.reactions.okay, r.totalFeedback)} | not_for_me ${pct(r.reactions.not_for_me, r.totalFeedback)}`);
  console.log(`Recs from feedback: ${r.recsFromFeedback}`);

  console.log(`\nDaily Trend:`);
  console.log('  Day | Opened | Skipped | Open Rate');
  console.log('  ----|--------|---------|----------');
  for (let d = 0; d < r.dayStats.length; d++) {
    const ds = r.dayStats[d];
    console.log(`   ${d + 1}  |  ${String(ds.opened).padStart(4)}  |  ${String(ds.skipped).padStart(4)}   | ${pct(ds.opened, ds.cards)}`);
  }

  console.log(`\nDistance → Reaction:`);
  console.log('  Bucket           | Total | Surprised | Okay  | Not For Me');
  console.log('  -----------------|-------|-----------|-------|----------');
  for (const [bucket, counts] of Object.entries(r.buckets)) {
    if (counts.total === 0) continue;
    const p = (n: number) => pct(n, counts.total).padStart(4);
    console.log(`  ${bucket.padEnd(17)} | ${String(counts.total).padStart(5)} | ${p(counts.surprised).padStart(9)} | ${p(counts.okay).padStart(5)} | ${p(counts.not_for_me).padStart(9)}`);
  }

  console.log(`\nD7 Engagement:`);
  console.log(`  Active: ${r.activeD7}/${r.userCount} (${pct(r.activeD7, r.userCount)}) | Churned: ${r.churned} | Happy (2+ surprises): ${r.happy}`);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Taste Roulette Simulation Analysis ===');
  console.log('Pure in-memory, 3 runs averaged per scenario\n');

  // Load tracks from DB
  const { data: rawTracks } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id, genres')
    .order('popularity', { ascending: false });

  if (!rawTracks?.length) {
    console.error('ERROR: No tracks in DB. Run "npm run seed" first.');
    process.exit(1);
  }

  const tracks: TrackData[] = rawTracks.map((t) => ({
    id: t.spotify_id,
    genres: t.genres || [],
    vec: genreToVector(t.genres || []),
  }));
  console.log(`Loaded ${tracks.length} tracks\n`);

  // Generate shared personas (reused across scenarios for fair comparison)
  const allPersonas = generatePersonas(100);

  const RUNS = 3;

  // ─── Scenario A: Current design (0.3-0.7) ──────────────────────────
  const configA: ScenarioConfig = {
    name: 'A) Current Design (0.3-0.7)',
    userCount: 100, days: 7,
    matchMinDist: 0.3, matchMaxDist: 0.7, matchCenter: 0.5, userRecDistCap: 1.0,
    userRecsEnabled: true, genreRepeatPenalty: false,
  };

  const configB: ScenarioConfig = {
    name: 'B) Full Range (no filter)',
    userCount: 100, days: 7,
    matchMinDist: 0.0, matchMaxDist: 1.0, matchCenter: 0.5, userRecDistCap: 1.0,
    userRecsEnabled: true, genreRepeatPenalty: false,
  };

  const configC: ScenarioConfig = {
    name: 'C) Tighter (0.3-0.55)',
    userCount: 100, days: 7,
    matchMinDist: 0.3, matchMaxDist: 0.55, matchCenter: 0.5, userRecDistCap: 1.0,
    userRecsEnabled: true, genreRepeatPenalty: false,
  };

  const configD: ScenarioConfig = {
    name: 'D) Cold Start (10 users)',
    userCount: 10, days: 7,
    matchMinDist: 0.3, matchMaxDist: 0.7, matchCenter: 0.5, userRecDistCap: 1.0,
    userRecsEnabled: false, genreRepeatPenalty: false,
  };

  const configE: ScenarioConfig = {
    name: 'E) + Genre Penalty',
    userCount: 100, days: 7,
    matchMinDist: 0.3, matchMaxDist: 0.7, matchCenter: 0.5, userRecDistCap: 1.0,
    userRecsEnabled: true, genreRepeatPenalty: true,
  };

  // ─── Scenario F: Tuned parameters from simulation findings ─────────
  const configF: ScenarioConfig = {
    name: 'F) TUNED (center=0.4, cap=0.75)',
    userCount: 100, days: 7,
    matchMinDist: 0.3, matchMaxDist: 0.7,
    matchCenter: 0.4,          // P1: prefer sweet_low zone
    userRecDistCap: 0.75,      // P0: reject too-far user recs
    userRecsEnabled: true, genreRepeatPenalty: false,
  };

  const scenarios = [configA, configB, configC, configD, configE, configF];

  for (const config of scenarios) {
    process.stdout.write(`Running ${config.name} (${RUNS}x)...`);
    const results: RunResult[] = [];
    for (let run = 0; run < RUNS; run++) {
      results.push(runSimulation(config, tracks, allPersonas));
      process.stdout.write(` run${run + 1}`);
    }
    console.log(' done');
    printResult(config.name, averageResults(results));
  }

  // ─── Comparative summary ───────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  COMPARATIVE SUMMARY');
  console.log(`${'═'.repeat(60)}\n`);
  console.log('Scenario                          | Open% | Surprise% | NotForMe% | D7 Ret% | Recs');
  console.log('----------------------------------|-------|-----------|-----------|---------|-----');

  for (const config of scenarios) {
    const results: RunResult[] = [];
    for (let run = 0; run < RUNS; run++) {
      results.push(runSimulation(config, tracks, allPersonas));
    }
    const r = averageResults(results);
    const pct = (n: number, d: number) => d > 0 ? `${((n / d) * 100).toFixed(0)}%` : 'N/A';
    console.log(
      `${config.name.padEnd(33)} | ${pct(r.totalOpened, r.totalCards).padStart(5)} | ${pct(r.reactions.surprised, r.totalFeedback).padStart(9)} | ${pct(r.reactions.not_for_me, r.totalFeedback).padStart(9)} | ${pct(r.activeD7, r.userCount).padStart(7)} | ${String(r.recsFromFeedback).padStart(4)}`
    );
  }

  console.log('\n✅ Analysis complete. Use these results to tune matching parameters.\n');
}

main().catch(console.error);
