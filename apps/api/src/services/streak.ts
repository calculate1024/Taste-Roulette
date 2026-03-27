import { supabaseAdmin } from './supabase';
import { getTodayStartUTC8 } from '../utils/date';

/**
 * Update a user's streak count when they open a card.
 * Counts consecutive days with at least one opened card, walking backwards from today.
 * This always recomputes from opened_at data, so it self-heals from any prior bugs.
 *
 * Returns the new streak count.
 */
export async function updateStreak(userId: string): Promise<number> {
  const todayStart = getTodayStartUTC8();

  // Check if user already opened a card today before this one (avoid redundant update)
  const { count: todayOpens } = await supabaseAdmin
    .from('roulette_cards')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .gte('opened_at', todayStart.toISOString());

  if (todayOpens && todayOpens > 1) {
    // Already counted today — return current value
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('streak_count')
      .eq('id', userId)
      .single();
    return profile?.streak_count ?? 1;
  }

  // Recompute streak: get distinct days with opened cards, ordered descending
  const { data: openDays } = await supabaseAdmin
    .from('roulette_cards')
    .select('opened_at')
    .eq('recipient_id', userId)
    .not('opened_at', 'is', null)
    .order('opened_at', { ascending: false })
    .limit(90); // max streak we'd ever count

  if (!openDays || openDays.length === 0) {
    await supabaseAdmin
      .from('profiles')
      .update({ streak_count: 1 })
      .eq('id', userId);
    return 1;
  }

  // Convert to unique UTC+8 date strings
  const uniqueDays = new Set<string>();
  for (const row of openDays) {
    const utc8 = new Date(new Date(row.opened_at).getTime() + 8 * 60 * 60 * 1000);
    uniqueDays.add(utc8.toISOString().slice(0, 10)); // "YYYY-MM-DD"
  }

  // Sort descending
  const sortedDays = [...uniqueDays].sort().reverse();

  // Today's date in UTC+8
  const nowUtc8 = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const todayStr = nowUtc8.toISOString().slice(0, 10);

  // Walk backwards from today counting consecutive days
  let streak = 0;
  let expectedDate = todayStr;

  for (const day of sortedDays) {
    if (day === expectedDate) {
      streak++;
      // Move expected to previous day
      const d = new Date(expectedDate + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      expectedDate = d.toISOString().slice(0, 10);
    } else if (day < expectedDate) {
      // Gap found — streak ends
      break;
    }
    // day > expectedDate: skip (duplicate or future, shouldn't happen)
  }

  // If today hasn't been counted yet but the first open day is yesterday,
  // that means the user is opening today's card right now — count today too
  if (streak === 0) {
    const yesterdayStr = (() => {
      const d = new Date(todayStr + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    })();

    if (sortedDays[0] === yesterdayStr) {
      // Yesterday was the last open day, and we're opening today now
      streak = 1; // today
      let exp = yesterdayStr;
      for (const day of sortedDays) {
        if (day === exp) {
          streak++;
          const d = new Date(exp + 'T00:00:00Z');
          d.setUTCDate(d.getUTCDate() - 1);
          exp = d.toISOString().slice(0, 10);
        } else if (day < exp) {
          break;
        }
      }
    } else {
      streak = 1; // fresh start
    }
  }

  const newStreak = Math.max(streak, 1);

  await supabaseAdmin
    .from('profiles')
    .update({ streak_count: newStreak })
    .eq('id', userId);

  return newStreak;
}
