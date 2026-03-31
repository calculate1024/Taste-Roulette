// One-time script: batch rewrite all harvest reasons using Claude Sonnet
// Usage: npx tsx src/scripts/content-harvest/rewrite-existing.ts [--dry-run]

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

import { createClient } from '@supabase/supabase-js';
import { batchRewrite } from './llm-rewriter';

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const dryRun = process.argv.includes('--dry-run');

async function main() {
  // Get all harvest curator profiles
  const { data: curators } = await sb
    .from('profiles')
    .select('id, display_name')
    .like('display_name', '%Editors%');

  if (!curators?.length) {
    console.log('No harvest curators found');
    return;
  }

  const curatorIds = curators.map((c) => c.id);
  const curatorMap: Record<string, string> = {};
  curators.forEach((c) => {
    curatorMap[c.id] = c.display_name.replace(' Editors', '');
  });

  // Get harvest recommendations missing English reason
  const { data: recs } = await sb
    .from('user_recommendations')
    .select('id, track_id, reason, reason_en, user_id')
    .in('user_id', curatorIds)
    .is('reason_en', null)
    .limit(1000);

  if (!recs?.length) {
    console.log('No harvest recs to rewrite');
    return;
  }

  // Get track metadata
  const trackIds = [...new Set(recs.map((r) => r.track_id))];
  const { data: tracks } = await sb
    .from('tracks')
    .select('spotify_id, title, artist, genres')
    .in('spotify_id', trackIds);

  const trackMap: Record<string, (typeof tracks extends (infer T)[] | null ? T : never)> = {};
  (tracks || []).forEach((t) => {
    trackMap[t.spotify_id] = t;
  });

  // Build rewrite inputs
  const inputs = recs
    .map((rec) => {
      const track = trackMap[rec.track_id];
      if (!track) return null;
      return {
        recId: rec.id,
        trackId: rec.track_id,
        artist: track.artist,
        title: track.title,
        genres: track.genres || [],
        sourceName: curatorMap[rec.user_id] || 'Unknown',
      };
    })
    .filter(Boolean) as Array<{
    recId: string;
    trackId: string;
    artist: string;
    title: string;
    genres: string[];
    sourceName: string;
  }>;

  console.log(`Found ${inputs.length} harvest recs to rewrite`);
  if (dryRun) {
    console.log('[DRY RUN] Would rewrite these:');
    for (const inp of inputs.slice(0, 5)) {
      console.log(`  ${inp.sourceName} | ${inp.artist} - ${inp.title}`);
    }
    console.log(`  ... and ${inputs.length - 5} more`);
    return;
  }

  // Batch rewrite via LLM
  console.log('Calling Claude Sonnet for batch rewrite...');
  const rewriteInputs = inputs.map((inp) => ({
    artist: inp.artist,
    title: inp.title,
    genres: inp.genres,
    sourceName: inp.sourceName,
  }));

  const results = await batchRewrite(rewriteInputs, 20);

  // Update DB
  let updated = 0;
  let failed = 0;

  for (const inp of inputs) {
    const key = `${inp.artist}|||${inp.title}`;
    const result = results.get(key);
    if (!result) {
      failed++;
      continue;
    }

    const { error } = await sb
      .from('user_recommendations')
      .update({
        reason: result.zh,
        reason_en: result.en,
      })
      .eq('id', inp.recId);

    if (error) {
      // reason_en column might not exist yet
      if (error.message.includes('reason_en')) {
        // Fallback: only update reason
        await sb
          .from('user_recommendations')
          .update({ reason: result.zh })
          .eq('id', inp.recId);
      } else {
        console.error(`  Failed to update ${inp.recId}:`, error.message);
        failed++;
        continue;
      }
    }
    updated++;
  }

  // Also update delivered cards that used harvest recs
  const { data: cards } = await sb
    .from('roulette_cards')
    .select('id, track_id, recommender_id')
    .in('recommender_id', curatorIds);

  let cardsUpdated = 0;
  for (const card of cards || []) {
    const track = trackMap[card.track_id];
    if (!track) continue;
    const source = curatorMap[card.recommender_id] || 'Unknown';
    const key = `${track.artist}|||${track.title}`;
    const result = results.get(key);
    if (!result) continue;

    await sb
      .from('roulette_cards')
      .update({ reason: result.zh })
      .eq('id', card.id);
    cardsUpdated++;
  }

  console.log(`\n=== REWRITE COMPLETE ===`);
  console.log(`Pool updated: ${updated}`);
  console.log(`Cards updated: ${cardsUpdated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total LLM results: ${results.size}`);

  // Print samples
  console.log(`\n=== SAMPLES ===`);
  let count = 0;
  for (const [key, val] of results) {
    if (count >= 5) break;
    console.log(`  ${key.replace('|||', ' - ')}`);
    console.log(`    zh: ${val.zh}`);
    console.log(`    en: ${val.en}`);
    count++;
  }
}

main().catch(console.error);
