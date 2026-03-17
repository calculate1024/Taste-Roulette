import { supabaseAdmin } from './supabase';
import { getTodayStartUTC8 } from '../utils/date';
import { VECTOR_DIM, REACTION_WEIGHTS, genreToVector } from '../utils/genres';

const SWEET_SPOT_MIN = 0.3;
const SWEET_SPOT_MAX = 0.7;

// --- Vector math utilities ---

/** Cosine distance between two vectors. Returns 1.0 for zero/empty vectors. */
function cosineDistance(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 1.0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 1.0;
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Compute taste vector from onboarding responses. Same algorithm as Python taste_engine.py. */
export async function computeTasteVector(userId: string): Promise<number[]> {
  // Get user's onboarding responses
  const { data: responses, error: respError } = await supabaseAdmin
    .from('onboarding_responses')
    .select('track_id, reaction')
    .eq('user_id', userId);

  if (respError || !responses || responses.length === 0) {
    return new Array(VECTOR_DIM).fill(0);
  }

  // Get track genres for all responded tracks
  const trackIds = responses.map((r: any) => r.track_id);
  const { data: tracks, error: trackError } = await supabaseAdmin
    .from('tracks')
    .select('spotify_id, genres')
    .in('spotify_id', trackIds);

  if (trackError || !tracks) {
    return new Array(VECTOR_DIM).fill(0);
  }

  const trackGenres: Record<string, string[]> = {};
  for (const t of tracks) {
    trackGenres[t.spotify_id] = t.genres || [];
  }

  // Compute weighted genre vector
  const weightedSum = new Array(VECTOR_DIM).fill(0);
  let weightTotal = 0;

  for (const resp of responses) {
    const weight = REACTION_WEIGHTS[resp.reaction] ?? 0;
    const genres = trackGenres[resp.track_id];
    if (!genres || genres.length === 0) continue;

    const genreVec = genreToVector(genres);
    for (let i = 0; i < VECTOR_DIM; i++) {
      weightedSum[i] += weight * genreVec[i];
    }
    weightTotal += Math.abs(weight);
  }

  if (weightTotal === 0) {
    return new Array(VECTOR_DIM).fill(0);
  }

  // Normalize by total weight
  return weightedSum.map((v: number) => v / weightTotal);
}

// --- Curator fallback ---

/** Pick a random track the user hasn't received before, as a system recommendation. */
export async function curatorFallback(
  userId: string
): Promise<{ trackId: string; reason: string } | null> {
  // Get track IDs the user has already received
  const { data: existingCards } = await supabaseAdmin
    .from('roulette_cards')
    .select('track_id')
    .eq('recipient_id', userId);

  const receivedTrackIds = (existingCards || []).map((c: any) => c.track_id);

  // Pick a random track not already received
  let query = supabaseAdmin
    .from('tracks')
    .select('spotify_id');

  if (receivedTrackIds.length > 0) {
    // Filter out already-received tracks
    query = query.not('spotify_id', 'in', `(${receivedTrackIds.join(',')})`);
  }

  const { data: candidates, error } = await query;

  if (error || !candidates || candidates.length === 0) {
    return null;
  }

  // Pick a random one
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { trackId: pick.spotify_id, reason: 'Curator 精選推薦' };
}

// --- Daily matching ---

interface MatchingSummary {
  matched: number;
  fallback: number;
  skipped: number;
}

/** Run daily matching for all active users without today's card. */
export async function runDailyMatching(): Promise<MatchingSummary> {
  const summary: MatchingSummary = { matched: 0, fallback: 0, skipped: 0 };

  // 1. Get all active users (onboarding_completed = true)
  const { data: users, error: usersError } = await supabaseAdmin
    .from('profiles')
    .select('id, taste_vector')
    .eq('onboarding_completed', true);

  if (usersError || !users || users.length === 0) {
    return summary;
  }

  // 2. Find which users already have a card for today
  const todayStart = getTodayStartUTC8();

  const { data: todayCards } = await supabaseAdmin
    .from('roulette_cards')
    .select('recipient_id')
    .gte('created_at', todayStart.toISOString());

  const usersWithCard = new Set(
    (todayCards || []).map((c: any) => c.recipient_id)
  );

  // Filter to users who need a card today
  const needsCard = users.filter((u: any) => !usersWithCard.has(u.id));

  if (needsCard.length === 0) {
    return summary;
  }

  // 3. Get available unused recommendations from the pool
  const { data: poolRecs } = await supabaseAdmin
    .from('user_recommendations')
    .select('id, user_id, track_id, reason')
    .eq('used', false);

  const availableRecs = poolRecs || [];

  // Build a lookup of recommender taste vectors (we already have user profiles)
  const userVectorMap: Record<string, number[]> = {};
  for (const u of users) {
    userVectorMap[u.id] = u.taste_vector || [];
  }

  // 4. For each user without today's card, try to match
  for (const user of needsCard) {
    const userVector = user.taste_vector || [];
    const hasVector = userVector.length > 0 && userVector.some((v: number) => v !== 0);

    let matched = false;

    if (hasVector && availableRecs.length > 0) {
      // Try to find a recommendation from the pool within the sweet spot
      type ScoredRec = { rec: typeof availableRecs[0]; dist: number };
      const scored: ScoredRec[] = [];

      for (const rec of availableRecs) {
        // Skip self-recommendations
        if (rec.user_id === user.id) continue;

        const recommenderVector = userVectorMap[rec.user_id];
        if (!recommenderVector || recommenderVector.length === 0) continue;

        const dist = cosineDistance(userVector, recommenderVector);
        if (dist >= SWEET_SPOT_MIN && dist <= SWEET_SPOT_MAX) {
          scored.push({ rec, dist });
        }
      }

      // Prefer distance closest to 0.5 (maximum surprise)
      scored.sort((a, b) => Math.abs(a.dist - 0.5) - Math.abs(b.dist - 0.5));

      if (scored.length > 0) {
        const best = scored[0];

        // Create the roulette card
        const { error: cardError } = await supabaseAdmin
          .from('roulette_cards')
          .insert({
            recipient_id: user.id,
            recommender_id: best.rec.user_id,
            track_id: best.rec.track_id,
            reason: best.rec.reason,
            taste_distance: best.dist,
            status: 'pending',
          });

        if (!cardError) {
          // Mark recommendation as used
          await supabaseAdmin
            .from('user_recommendations')
            .update({ used: true })
            .eq('id', best.rec.id);

          // Remove from available pool so it's not reused in this run
          const idx = availableRecs.findIndex((r) => r.id === best.rec.id);
          if (idx !== -1) availableRecs.splice(idx, 1);

          summary.matched++;
          matched = true;
        }
      }
    }

    // Fallback to curator if no pool match found
    if (!matched) {
      const fallbackResult = await curatorFallback(user.id);
      if (fallbackResult) {
        const { error: cardError } = await supabaseAdmin
          .from('roulette_cards')
          .insert({
            recipient_id: user.id,
            recommender_id: null,
            track_id: fallbackResult.trackId,
            reason: fallbackResult.reason,
            taste_distance: null,
            status: 'pending',
          });

        if (!cardError) {
          summary.fallback++;
        } else {
          summary.skipped++;
        }
      } else {
        summary.skipped++;
      }
    }
  }

  return summary;
}
