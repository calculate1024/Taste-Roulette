// Seed virtual users with diverse taste vectors and pre-loaded recommendations.
// These create a healthy recommendation pool for the matching engine from day 1.
//
// Usage: npx tsx src/scripts/seed-users.ts
//
// Prerequisites:
// - Seed tracks must be loaded first (npm run seed)
// - Supabase must have the profiles and user_recommendations tables
//
// NOTE: This script creates Supabase Auth users with fake emails.
// To clean up, delete from auth.users where email LIKE '%@taste-roulette.bot'.

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 20-dim genre vector indices:
// 0:pop 1:rock 2:hip-hop 3:r&b 4:jazz 5:classical 6:electronic
// 7:latin 8:country 9:folk 10:metal 11:punk 12:indie 13:soul
// 14:blues 15:reggae 16:world 17:ambient 18:k-pop 19:j-pop

interface SeedUser {
  email: string;
  displayName: string;
  tasteVector: number[];
  recommendations: { trackId: string; reason: string }[];
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'aria-pop@taste-roulette.bot',
    displayName: 'Aria',
    // Strong pop/r&b/k-pop preference
    tasteVector: [0.8, 0.1, 0.2, 0.6, 0.0, 0.0, 0.3, 0.2, 0.0, 0.0, 0.0, 0.0, 0.1, 0.1, 0.0, 0.0, 0.0, 0.0, 0.7, 0.3],
    recommendations: [
      { trackId: '0VjIjW4GlUZAMYd2vXMi3b', reason: '第一次聽就迴圈了整個下午，合成器的音色太迷人了' },
      { trackId: '03UrZgTINDqvnUMbbIMhql', reason: '不要因為 meme 就忽略這首，認真聽節奏設計真的厲害' },
      { trackId: '4i8xlL0EqaSj9piUVUOQQO', reason: '鄉村音樂的入門曲，Dolly 的聲音能融化任何偏見' },
    ],
  },
  {
    email: 'kai-rock@taste-roulette.bot',
    displayName: 'Kai',
    // Strong rock/metal/indie preference
    tasteVector: [0.1, 0.9, 0.0, 0.0, 0.1, 0.0, 0.1, 0.0, 0.0, 0.2, 0.7, 0.4, 0.6, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0],
    recommendations: [
      { trackId: '4u7EnebtmKWzUH433cf5Qv', reason: '六分鐘的旅程，從歌劇到硬搖滾，每個轉折都是驚喜' },
      { trackId: '2MuWTIM3b0YEAskbeeFE1i', reason: '金屬樂不是噪音，這首的吉他 riff 精密到像瑞士鐘錶' },
      { trackId: '3B3eOgLJSqPEA0RfboIQVM', reason: '用最少的樂器說最多的故事，indie folk 的教科書' },
    ],
  },
  {
    email: 'luna-jazz@taste-roulette.bot',
    displayName: 'Luna',
    // Strong jazz/classical/soul/blues preference
    tasteVector: [0.0, 0.0, 0.0, 0.2, 0.9, 0.7, 0.0, 0.0, 0.0, 0.1, 0.0, 0.0, 0.0, 0.6, 0.5, 0.0, 0.1, 0.2, 0.0, 0.0],
    recommendations: [
      { trackId: '1YQWosTIljIvxAgHWTp7KP', reason: '5/4 拍竟然能這麼自然地搖擺，Dave Brubeck 是天才' },
      { trackId: '6Er8Fz6fuZNi5cvwQjv1ya', reason: '月光下的鋼琴，一百年後依然動人，適合下雨天獨處' },
      { trackId: '1h2xVEoJORqrg71HocgqXd', reason: 'Stevie Wonder 的 groove 感是超越時代的，funky 到骨子裡' },
    ],
  },
  {
    email: 'nova-electronic@taste-roulette.bot',
    displayName: 'Nova',
    // Strong electronic/ambient/hip-hop preference
    tasteVector: [0.2, 0.0, 0.5, 0.1, 0.0, 0.0, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.7, 0.1, 0.1],
    recommendations: [
      { trackId: '6c9EGVj5CaOeoKd9ecMW1U', reason: '前面慢慢鋪陳，等到 drop 的時候整個人都站起來了' },
      { trackId: '6kkwzB6hXLIONkEk9JciA6', reason: '科學研究說能降低 65% 的焦慮，我覺得是 100%' },
      { trackId: '5Z01UMMf7V1o0MzF86s6WJ', reason: '嘻哈的能量感是很純粹的，前奏一下就進入狀態' },
    ],
  },
  {
    email: 'rio-world@taste-roulette.bot',
    displayName: 'Rio',
    // Strong latin/reggae/world/folk/j-pop preference (eclectic)
    tasteVector: [0.1, 0.0, 0.0, 0.1, 0.1, 0.0, 0.0, 0.8, 0.2, 0.5, 0.0, 0.0, 0.0, 0.1, 0.1, 0.7, 0.6, 0.0, 0.0, 0.5],
    recommendations: [
      { trackId: '6habFhsOp2NvshLv26DqMb', reason: '拉丁節奏的感染力不需要翻譯，身體會自己動起來' },
      { trackId: '3PQLYVskjUeRmRIfECsL0X', reason: '雷鬼的慵懶節奏裡藏著最溫柔的力量，適合放空' },
      { trackId: '04TshWXkhV1qkqHzf31Hn6', reason: '米津玄師的旋律超越語言，聽不懂日文也會被打動' },
    ],
  },
];

async function seedUsers() {
  console.log('Starting seed users...\n');

  // Verify tracks exist
  const { data: trackCount } = await supabase
    .from('tracks')
    .select('spotify_id', { count: 'exact', head: true });

  console.log(`Found ${trackCount?.length ?? 0} tracks in database.\n`);

  for (const seedUser of SEED_USERS) {
    console.log(`--- ${seedUser.displayName} (${seedUser.email}) ---`);

    // 1. Create auth user (or get existing)
    let userId: string;

    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('display_name', seedUser.displayName)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;
      console.log(`  EXISTS: ${userId}`);
    } else {
      // Create via admin API
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: seedUser.email,
        password: `seed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        email_confirm: true,
      });

      if (authError) {
        console.error(`  FAILED to create auth user: ${authError.message}`);
        continue;
      }

      userId = authUser.user.id;
      console.log(`  CREATED: ${userId}`);
    }

    // 2. Update profile with taste vector and display name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: seedUser.displayName,
        taste_vector: seedUser.tasteVector,
        onboarding_completed: true,
        is_curator: true,
        curator_weight: 1.5,
      })
      .eq('id', userId);

    if (profileError) {
      console.error(`  FAILED to update profile: ${profileError.message}`);
      continue;
    }
    console.log(`  Profile updated (${seedUser.tasteVector.filter(v => v > 0.3).length} strong genres)`);

    // 3. Insert recommendations (skip if already exist)
    for (const rec of seedUser.recommendations) {
      const { data: existing } = await supabase
        .from('user_recommendations')
        .select('id')
        .eq('user_id', userId)
        .eq('track_id', rec.trackId)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`  REC EXISTS: ${rec.trackId}`);
        continue;
      }

      const { error: recError } = await supabase
        .from('user_recommendations')
        .insert({
          user_id: userId,
          track_id: rec.trackId,
          reason: rec.reason,
          is_curator_pick: true,
          used: false,
        });

      if (recError) {
        console.error(`  FAILED to insert rec ${rec.trackId}: ${recError.message}`);
      } else {
        console.log(`  REC OK: ${rec.trackId}`);
      }
    }

    console.log('');
  }

  // Summary
  const { count: totalRecs } = await supabase
    .from('user_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('used', false);

  console.log(`\n=== DONE ===`);
  console.log(`Seed users: ${SEED_USERS.length}`);
  console.log(`Total unused recommendations in pool: ${totalRecs ?? 'unknown'}`);
  console.log(`\nThe matching engine will now use these recommendations for real users.`);
}

seedUsers().catch((err) => {
  console.error('Seed users failed:', err);
  process.exit(1);
});
