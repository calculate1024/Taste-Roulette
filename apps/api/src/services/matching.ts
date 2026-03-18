import { supabaseAdmin } from './supabase';
import { getTodayStartUTC8 } from '../utils/date';
import { VECTOR_DIM, GENRES, GENRE_INDEX, REACTION_WEIGHTS, genreToVector, getTasteLabel, TASTE_LABELS } from '../utils/genres';
import { cosineDistance } from '../utils/vector';

const SWEET_SPOT_MIN = 0.3;
const SWEET_SPOT_MAX = 0.7;

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
    .select('id, taste_vector, curator_weight')
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
  // Include is_curator_pick flag so we can prioritize curator recommendations
  const { data: poolRecs } = await supabaseAdmin
    .from('user_recommendations')
    .select('id, user_id, track_id, reason, is_curator_pick')
    .eq('used', false);

  const availableRecs = poolRecs || [];

  // Build a lookup of recommender taste vectors and curator weights
  const userVectorMap: Record<string, number[]> = {};
  const curatorWeightMap: Record<string, number> = {};
  for (const u of users) {
    userVectorMap[u.id] = u.taste_vector || [];
    // Store curator weight for priority sorting (default 1.0 for non-curators)
    curatorWeightMap[u.id] = (u as any).curator_weight || 1.0;
  }

  // 4. For each user without today's card, try to match
  for (const user of needsCard) {
    const userVector = user.taste_vector || [];
    const hasVector = userVector.length > 0 && userVector.some((v: number) => v !== 0);

    let matched = false;

    if (hasVector && availableRecs.length > 0) {
      // Try to find a recommendation from the pool within the sweet spot.
      // Curator picks get priority: they are sorted first, weighted by the
      // recommender's curator_weight (default 1.5). Among same-priority
      // recommendations, prefer distance closest to 0.5 (maximum surprise).
      type ScoredRec = { rec: typeof availableRecs[0]; dist: number; isCurator: boolean; weight: number };
      const scored: ScoredRec[] = [];

      for (const rec of availableRecs) {
        // Skip self-recommendations
        if (rec.user_id === user.id) continue;

        const recommenderVector = userVectorMap[rec.user_id];
        if (!recommenderVector || recommenderVector.length === 0) continue;

        const dist = cosineDistance(userVector, recommenderVector);
        if (dist >= SWEET_SPOT_MIN && dist <= SWEET_SPOT_MAX) {
          const isCurator = rec.is_curator_pick === true;
          const weight = isCurator ? (curatorWeightMap[rec.user_id] || 1.5) : 1.0;
          scored.push({ rec, dist, isCurator, weight });
        }
      }

      // Sort: curator picks first (by weight descending), then by distance to 0.5
      scored.sort((a, b) => {
        // Curator picks come before non-curator picks
        if (a.isCurator !== b.isCurator) return a.isCurator ? -1 : 1;
        // Among curators, higher weight first
        if (a.isCurator && b.isCurator && a.weight !== b.weight) return b.weight - a.weight;
        // Then by distance to the sweet spot center (0.5)
        return Math.abs(a.dist - 0.5) - Math.abs(b.dist - 0.5);
      });

      if (scored.length > 0) {
        const best = scored[0];

        // Compute recommender taste label for progressive reveal
        const recommenderVector = userVectorMap[best.rec.user_id] || [];
        const tasteLabel = getTasteLabel(recommenderVector);

        // Create the roulette card
        const { error: cardError } = await supabaseAdmin
          .from('roulette_cards')
          .insert({
            recipient_id: user.id,
            recommender_id: best.rec.user_id,
            track_id: best.rec.track_id,
            reason: best.rec.reason,
            taste_distance: best.dist,
            recommender_taste_label: tasteLabel,
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
            recommender_taste_label: 'Curator 策展人',
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

// --- Feedback-driven taste vector update ---

const FEEDBACK_LEARNING_RATE = 0.1;
const FEEDBACK_WEIGHTS: Record<string, number> = {
  surprised: 1.0,
  okay: 0.2,
  not_for_me: -0.3,
};

export interface TasteInsight {
  oldVector: number[];
  newVector: number[];
  delta: number[];
  dominantShift: { genre: string; label: string; change: number } | null;
  genresExplored: number;
  newBadge: { genre: string; label: string; emoji: string } | null;
}

/** Incrementally update taste vector based on feedback reaction. */
export async function updateTasteVectorFromFeedback(
  userId: string,
  trackId: string,
  reaction: string
): Promise<TasteInsight> {
  // 1. Get current vector
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('taste_vector')
    .eq('id', userId)
    .single();

  const oldVector: number[] = profile?.taste_vector || new Array(VECTOR_DIM).fill(0);

  // 2. Get track genres
  const { data: track } = await supabaseAdmin
    .from('tracks')
    .select('genres')
    .eq('spotify_id', trackId)
    .single();

  const genres: string[] = track?.genres || [];
  if (genres.length === 0) {
    return {
      oldVector,
      newVector: oldVector,
      delta: new Array(VECTOR_DIM).fill(0),
      dominantShift: null,
      genresExplored: 0,
      newBadge: null,
    };
  }

  // 3. Compute delta
  const genreVec = genreToVector(genres);
  const weight = FEEDBACK_WEIGHTS[reaction] ?? 0;
  const delta = genreVec.map((v: number) => v * weight * FEEDBACK_LEARNING_RATE);

  // 4. Apply delta
  const newVector = oldVector.map((v: number, i: number) => v + delta[i]);

  // 5. Save updated vector
  await supabaseAdmin
    .from('profiles')
    .update({ taste_vector: newVector })
    .eq('id', userId);

  // 6. Find dominant shift (largest absolute delta)
  let maxIdx = 0;
  let maxAbs = 0;
  for (let i = 0; i < delta.length; i++) {
    if (Math.abs(delta[i]) > maxAbs) {
      maxAbs = Math.abs(delta[i]);
      maxIdx = i;
    }
  }

  const dominantShift = maxAbs > 0
    ? {
        genre: GENRES[maxIdx],
        label: TASTE_LABELS[GENRES[maxIdx]] || GENRES[maxIdx],
        change: +(delta[maxIdx].toFixed(3)),
      }
    : null;

  // 7. Count genres explored from all received cards
  const { data: receivedTracks } = await supabaseAdmin
    .from('roulette_cards')
    .select('tracks:track_id(genres)')
    .eq('recipient_id', userId);

  const genreSet = new Set<string>();
  if (receivedTracks) {
    for (const row of receivedTracks) {
      const t = row.tracks as unknown as { genres: string[] } | null;
      if (t?.genres) t.genres.forEach((g: string) => genreSet.add(g));
    }
  }

  // 8. Check for first-time 'surprised' in this genre category (badge unlock)
  const GENRE_CATEGORIES = [
    { key: 'pop_rnb', label: 'Pop/R&B 探索者', emoji: '🎤', indices: [0, 3, 18, 19] },
    { key: 'rock_metal', label: 'Rock/Metal 探索者', emoji: '🎸', indices: [1, 10, 11, 12] },
    { key: 'hiphop_soul', label: 'Hip-Hop/Soul 探索者', emoji: '🎧', indices: [2, 13, 14] },
    { key: 'electronic', label: 'Electronic 探索者', emoji: '🎹', indices: [6, 17] },
    { key: 'jazz_classical', label: 'Jazz/Classical 探索者', emoji: '🎷', indices: [4, 5] },
    { key: 'world_folk', label: 'World/Folk 探索者', emoji: '🌍', indices: [7, 8, 9, 15, 16] },
  ];

  let newBadge: TasteInsight['newBadge'] = null;
  if (reaction === 'surprised' && genres.length > 0) {
    const trackGenreIndices = genres
      .map((g: string) => GENRE_INDEX[g.toLowerCase()])
      .filter((i): i is number => i !== undefined);

    const matchedCategory = GENRE_CATEGORIES.find((cat) =>
      cat.indices.some((i) => trackGenreIndices.includes(i))
    );

    if (matchedCategory) {
      const categoryGenreNames = matchedCategory.indices.map((i) => GENRES[i]);

      // Get all previous 'surprised' feedbacks from this user (excluding current)
      const { data: prevFeedbacks } = await supabaseAdmin
        .from('feedbacks')
        .select('card_id')
        .eq('user_id', userId)
        .eq('reaction', 'surprised');

      let hadPrevious = false;
      if (prevFeedbacks && prevFeedbacks.length > 1) {
        // Get track genres for all previously surprised cards
        const prevCardIds = prevFeedbacks.map((f: any) => f.card_id);
        const { data: prevCards } = await supabaseAdmin
          .from('roulette_cards')
          .select('track_id, tracks:track_id(genres)')
          .in('id', prevCardIds)
          .neq('track_id', trackId);

        hadPrevious = (prevCards || []).some((card: any) => {
          const cardGenres: string[] = card.tracks?.genres || [];
          return cardGenres.some((g: string) => categoryGenreNames.includes(g.toLowerCase()));
        });
      }

      if (!hadPrevious) {
        newBadge = {
          genre: matchedCategory.key,
          label: matchedCategory.label,
          emoji: matchedCategory.emoji,
        };
      }
    }
  }

  return { oldVector, newVector, delta, dominantShift, genresExplored: genreSet.size, newBadge };
}
