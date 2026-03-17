import { supabaseAdmin } from './supabase';
import { getTodayStartUTC8 } from '../utils/date';

/**
 * Update a user's streak count when they open a card.
 * - If they opened a card yesterday: increment streak
 * - If they already opened a card today: no change
 * - Otherwise: reset to 1
 * Returns the new streak count.
 *
 * Note: This uses read-modify-write which has a theoretical race condition.
 * For MVP this is acceptable; production would use a Supabase RPC (stored function)
 * for atomic increment.
 */
export async function updateStreak(userId: string): Promise<number> {
  const todayStart = getTodayStartUTC8();
  const now = new Date();

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  // Check if user already opened a card today (avoid double-counting)
  const { count: todayOpens } = await supabaseAdmin
    .from('roulette_cards')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .gte('opened_at', todayStart.toISOString())
    .lt('opened_at', now.toISOString());

  // If already opened today (more than the current one), keep existing streak
  if (todayOpens && todayOpens > 1) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('streak_count')
      .eq('id', userId)
      .single();
    return profile?.streak_count ?? 1;
  }

  // Check if user opened a card yesterday
  const { count: yesterdayOpens } = await supabaseAdmin
    .from('roulette_cards')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .gte('opened_at', yesterdayStart.toISOString())
    .lt('opened_at', todayStart.toISOString());

  let newStreak: number;

  if (yesterdayOpens && yesterdayOpens > 0) {
    // Opened yesterday — increment streak
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('streak_count')
      .eq('id', userId)
      .single();
    newStreak = (profile?.streak_count ?? 0) + 1;
  } else {
    // No card opened yesterday — reset streak to 1
    newStreak = 1;
  }

  // Update profiles table
  await supabaseAdmin
    .from('profiles')
    .update({ streak_count: newStreak })
    .eq('id', userId);

  return newStreak;
}
