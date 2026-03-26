// Create curator profile and insert harvested recommendations into the pool

import { supabaseAdmin } from '../../services/supabase';
import { VECTOR_DIM, genreToVector } from '../../utils/genres';
import type { SourceConfig, MatchedTrack } from './types';

/** Build taste vector from dominant genres (same pattern as seed-users.ts). */
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

/** Ensure curator profile exists. Returns profile ID. */
export async function ensureCuratorProfile(config: SourceConfig): Promise<string> {
  // Check if profile already exists by email
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('display_name', config.curatorDisplayName)
    .eq('is_curator', true)
    .maybeSingle();

  if (existing) return existing.id;

  // Create auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: config.curatorEmail,
    password: `harvest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    email_confirm: true,
  });

  if (authError) {
    // If user already exists (e.g. from previous run), find their ID
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const found = users?.users?.find((u) => u.email === config.curatorEmail);
    if (found) {
      // Ensure profile exists
      await supabaseAdmin.from('profiles').upsert({
        id: found.id,
        display_name: config.curatorDisplayName,
        is_curator: true,
        curator_weight: 1.5,
        is_seed: true,
        onboarding_completed: true,
        taste_vector: buildTasteVector(config.dominantGenres),
      }, { onConflict: 'id' });
      return found.id;
    }
    throw new Error(`Failed to create curator auth user: ${authError.message}`);
  }

  const userId = authUser.user.id;

  // Create profile
  await supabaseAdmin.from('profiles').upsert({
    id: userId,
    display_name: config.curatorDisplayName,
    is_curator: true,
    curator_weight: 1.5,
    is_seed: true,
    onboarding_completed: true,
    taste_vector: buildTasteVector(config.dominantGenres),
  }, { onConflict: 'id' });

  console.log(`  Created curator profile: ${config.curatorDisplayName} (${userId})`);
  return userId;
}

/** Insert matched tracks as curator recommendations. Returns insert count. */
export async function insertRecommendations(
  curatorId: string,
  tracks: MatchedTrack[],
  existingTrackIds: Set<string>,
  dryRun = false
): Promise<{ inserted: number; duplicate: number }> {
  let inserted = 0;
  let duplicate = 0;

  for (const track of tracks) {
    if (existingTrackIds.has(track.spotifyId)) {
      duplicate++;
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would insert: ${track.artist} - ${track.title} (${track.spotifyId})`);
      console.log(`            Reason: ${track.reason}`);
      inserted++;
      existingTrackIds.add(track.spotifyId);
      continue;
    }

    const { error } = await supabaseAdmin.from('user_recommendations').insert({
      user_id: curatorId,
      track_id: track.spotifyId,
      reason: track.reason,
      is_curator_pick: true,
      used: false,
      source_url: track.sourceUrl,
    });

    if (error) {
      console.warn(`  Failed to insert rec for ${track.spotifyId}: ${error.message}`);
    } else {
      inserted++;
      existingTrackIds.add(track.spotifyId);
    }
  }

  return { inserted, duplicate };
}
