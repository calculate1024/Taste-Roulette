// Seed virtual users with diverse taste profiles and pre-loaded recommendations.
// These create a healthy recommendation pool for the matching engine from day 1.
//
// Usage: npx tsx src/scripts/seed-users.ts
//
// Prerequisites:
// - Seed tracks must be loaded first (npm run seed)
// - Supabase must have the profiles and user_recommendations tables

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { supabaseAdmin } from '../services/supabase';
import { GENRES, VECTOR_DIM, genreToVector } from '../utils/genres';

interface SeedRecommendation {
  spotifyId: string;
  reason: string;
}

interface SeedUser {
  email: string;
  displayName: string;
  dominantGenres: string[];
  recommendations: SeedRecommendation[];
}

const SEED_PASSWORD = 'seed-user-password-2024';

/** Build a taste vector by combining one-hot vectors for each dominant genre. */
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

const SEED_USERS: SeedUser[] = [
  {
    email: 'seed-pop@taste-roulette.local',
    displayName: 'Pop Explorer',
    dominantGenres: ['pop', 'r&b', 'k-pop'],
    recommendations: [
      // Dominant genre tracks
      { spotifyId: '0VjIjW4GlUZAMYd2vXMi3b', reason: '第一次聽就迴圈了整個下午，合成器的音色太迷人了' },
      { spotifyId: '7qiZfU4dY1lWllzX7mPBI3', reason: '極簡的 loop 能讓全世界跟著哼，這就是好旋律的力量' },
      { spotifyId: '5XeFesFbtLpXzIVDNQP22n', reason: 'BTS 用英文唱的純粹快樂，不需要理由就會笑' },
      { spotifyId: '03UrZgTINDqvnUMbbIMhql', reason: '不要因為 meme 就忽略這首，認真聽節奏設計真的厲害' },
      // Cross-genre diversity
      { spotifyId: '3DamFFqW32WihKkTVlwTYQ', reason: '復古靈魂樂的質感配上現代節拍，讓人想跟著搖擺' },
      { spotifyId: '7GhIk7Il098yCjg4BQjzvb', reason: '電子舞曲也能讓你熱淚盈眶，副歌的力量太強了' },
      { spotifyId: '6habFhsOp2NvshLv26DqMb', reason: '拉丁節奏的身體記憶比語言更快' },
    ],
  },
  {
    email: 'seed-rock@taste-roulette.local',
    displayName: 'Rock Spirit',
    dominantGenres: ['rock', 'indie', 'punk'],
    recommendations: [
      // Dominant genre tracks
      { spotifyId: '4u7EnebtmKWzUH433cf5Qv', reason: '六分鐘穿越歌劇、搖滾和敘事，每次重聽都有新層次' },
      { spotifyId: '3n3Ppam7vgaVa1iaRUc9Lp', reason: '二十年過去了，Mr. Brightside 在每個搖滾夜依然是終曲' },
      { spotifyId: '3bhiCVExl89MfoAjx9fMuE', reason: '龐克的精髓就是三個和弦加上一腔不顧一切的熱血' },
      { spotifyId: '0pqnGHJpmpxLKifKRmU6WP', reason: '輕快的旋律底下藏著暗黑歌詞，indie 的反差魅力' },
      // Cross-genre diversity
      { spotifyId: '2MuWTIM3b0YEAskbeeFE1i', reason: '金屬樂的結構可以精密得像交響樂，Metallica 證明了這點' },
      { spotifyId: '5Z01UMMf7V1o0MzF86s6WJ', reason: '嘻哈和搖滾共享的是那股不服輸的勁，Eminem 把它推到極致' },
      { spotifyId: '3B3eOgLJSqPEA0RfboIQVM', reason: '小木屋裡的假音和吉他，indie folk 最動人的起點' },
    ],
  },
  {
    email: 'seed-jazz@taste-roulette.local',
    displayName: 'Jazz Soul',
    dominantGenres: ['jazz', 'blues', 'soul'],
    recommendations: [
      // Dominant genre tracks
      { spotifyId: '1YQWosTIljIvxAgHWTp7KP', reason: '5/4 拍竟然聽起來這麼自然，爵士入門的最佳起點' },
      { spotifyId: '1BxfuPKGuaTgP7aM0Bbdwr', reason: 'Nina Simone 的聲音讓平凡的早晨都變成電影場景' },
      { spotifyId: '4gMgiXfqyzZLMhsksGmbQV', reason: 'B.B. King 的吉他真的會哭，每個彎音都是一個故事' },
      { spotifyId: '1h2xVEoJORqrg71HocgqXd', reason: 'Stevie Wonder 的 groove 從第一秒就把你抓住不放' },
      // Cross-genre diversity
      { spotifyId: '3DamFFqW32WihKkTVlwTYQ', reason: 'Childish Gambino 把七零年代靈魂樂帶進了 2020 年代' },
      { spotifyId: '6mFkJmJqdDVQ1REhVfGgd1', reason: '薩提的極簡鋼琴和爵士共享一種「留白的美」' },
    ],
  },
  {
    email: 'seed-electronic@taste-roulette.local',
    displayName: 'Electronic Mind',
    dominantGenres: ['electronic', 'ambient'],
    recommendations: [
      // Dominant genre tracks
      { spotifyId: '6c9EGVj5CaOeoKd9ecMW1U', reason: '七分鐘的鋪陳等到 drop 落下的瞬間，整個世界都亮了' },
      { spotifyId: '6kkwzB6hXLIONkEk9JciA6', reason: '科學實證能降低焦慮 65% 的音樂，睡前必聽' },
      { spotifyId: '7GhIk7Il098yCjg4BQjzvb', reason: 'Swedish House Mafia 證明了電子樂也能承載深刻的情感' },
      { spotifyId: '5ghIJDpPoe3CfHMGu71E6T', reason: 'Daft Punk 的製作加上 The Weeknd 的聲線，未來感十足' },
      // Cross-genre diversity
      { spotifyId: '6mFkJmJqdDVQ1REhVfGgd1', reason: '薩提在一百多年前就預見了環境音樂的概念' },
      { spotifyId: '0VjIjW4GlUZAMYd2vXMi3b', reason: '合成器浪潮的最佳代言，復古的聲音設計令人著迷' },
      { spotifyId: '04TshWXkhV1qkqHzf31Hn6', reason: '米津玄師的電子編曲風格跟 J-Pop 旋律的融合很巧妙' },
    ],
  },
  {
    email: 'seed-hiphop@taste-roulette.local',
    displayName: 'Hip-Hop Head',
    dominantGenres: ['hip-hop', 'r&b', 'soul'],
    recommendations: [
      // Dominant genre tracks
      { spotifyId: '5Z01UMMf7V1o0MzF86s6WJ', reason: '不管聽幾次，前奏一下就自動進入戰鬥模式' },
      { spotifyId: '3DamFFqW32WihKkTVlwTYQ', reason: '復古靈魂樂的溫度配上現代製作，時空穿越的質感' },
      { spotifyId: '1h2xVEoJORqrg71HocgqXd', reason: 'Funk 和嘻哈是親兄弟，Stevie Wonder 是共同的祖先' },
      { spotifyId: '2374M0fQpWi3dLnB54qaLX', reason: '八零年代最偉大的副歌之一，旋律刻進 DNA 的那種' },
      // Cross-genre diversity
      { spotifyId: '0VjIjW4GlUZAMYd2vXMi3b', reason: 'The Weeknd 模糊了 R&B 和流行的界線，這就是進化' },
      { spotifyId: '0e7ipj03S05BNilyu5bRzt', reason: '另類搖滾也能有嘻哈的節奏感，試試看打開新世界' },
      { spotifyId: '6habFhsOp2NvshLv26DqMb', reason: '拉丁節拍和嘻哈的律動有異曲同工之妙' },
    ],
  },
  {
    email: 'seed-classical@taste-roulette.local',
    displayName: 'Classical Purist',
    dominantGenres: ['classical', 'ambient'],
    recommendations: [
      // Dominant genre tracks
      { spotifyId: '6Er8Fz6fuZNi5cvwQjv1ya', reason: '月光下的鋼琴，百年前的音樂依然讓人起雞皮疙瘩' },
      { spotifyId: '6mFkJmJqdDVQ1REhVfGgd1', reason: '薩提的每個留白都是刻意的美，極簡主義的先驅' },
      { spotifyId: '6kkwzB6hXLIONkEk9JciA6', reason: '現代環境音樂和古典一脈相承，都追求聲音的純粹' },
      // Cross-genre diversity
      { spotifyId: '1YQWosTIljIvxAgHWTp7KP', reason: '爵士的即興和古典的結構美學其實是硬幣的兩面' },
      { spotifyId: '3B3eOgLJSqPEA0RfboIQVM', reason: '民謠的簡單和古典的留白有種共通的寧靜' },
      { spotifyId: '4u7EnebtmKWzUH433cf5Qv', reason: 'Queen 把歌劇元素融入搖滾，古典樂迷會懂那個結構' },
    ],
  },
  {
    email: 'seed-world@taste-roulette.local',
    displayName: 'World Wanderer',
    dominantGenres: ['world', 'latin', 'reggae', 'folk'],
    recommendations: [
      // Dominant genre tracks
      { spotifyId: '1mea3bSkSGXuIRvnWJo9Id', reason: '世界盃的集體記憶，這首歌讓全場不分國籍一起跳' },
      { spotifyId: '6habFhsOp2NvshLv26DqMb', reason: '拉丁節奏的感染力跨越語言，身體比大腦先反應' },
      { spotifyId: '3PQLYVskjUeRmRIfECsL0X', reason: '雷鬼的慵懶裡藏著最深的溫柔，Bob Marley 是永恆的' },
      { spotifyId: '2gMXnyrvIjhVBUZwvLZDMP', reason: '三個和弦就寫出了想回家的感覺，民謠的魔力' },
      // Cross-genre diversity
      { spotifyId: '03UrZgTINDqvnUMbbIMhql', reason: 'K-Pop 也是一種世界音樂，PSY 把韓國推向全球' },
      { spotifyId: '4i8xlL0EqaSj9piUVUOQQO', reason: '鄉村音樂的敘事傳統和民謠一脈相承' },
      { spotifyId: '1h2xVEoJORqrg71HocgqXd', reason: '放克的律動是全世界共通的身體語言' },
    ],
  },
  {
    email: 'seed-metal@taste-roulette.local',
    displayName: 'Metal Forge',
    dominantGenres: ['metal', 'rock', 'punk'],
    recommendations: [
      // Dominant genre tracks
      { spotifyId: '2MuWTIM3b0YEAskbeeFE1i', reason: '金屬不只是噪音，Master of Puppets 的結構精密如交響曲' },
      { spotifyId: '4u7EnebtmKWzUH433cf5Qv', reason: 'Queen 的搖滾精神和金屬一樣不妥協，經典就是經典' },
      { spotifyId: '3bhiCVExl89MfoAjx9fMuE', reason: '龐克的三和弦哲學：不需要炫技，只需要態度' },
      { spotifyId: '3n3Ppam7vgaVa1iaRUc9Lp', reason: '搖滾的能量不分年代，The Killers 的能量場永不斷電' },
      // Cross-genre diversity
      { spotifyId: '6c9EGVj5CaOeoKd9ecMW1U', reason: '電子樂的 build-up 和金屬的 riff 有類似的張力釋放' },
      { spotifyId: '5Z01UMMf7V1o0MzF86s6WJ', reason: 'Eminem 的攻擊性和金屬一樣猛烈，只是武器不同' },
      { spotifyId: '6Er8Fz6fuZNi5cvwQjv1ya', reason: '很多金屬樂手的古典底子都很深，試試源頭的聲音' },
    ],
  },
];

async function seedUsers() {
  console.log('=== Seed Users Script ===\n');

  let usersCreated = 0;
  let usersUpdated = 0;
  let recsLoaded = 0;

  for (const seedUser of SEED_USERS) {
    console.log(`Processing: ${seedUser.displayName} (${seedUser.email})`);

    // 1. Check if auth user already exists
    let userId: string;

    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingList?.users?.find((u) => u.email === seedUser.email);

    if (existing) {
      userId = existing.id;
      console.log(`  Auth user already exists: ${userId}`);
      usersUpdated++;
    } else {
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: seedUser.email,
        email_confirm: true,
        password: SEED_PASSWORD,
      });

      if (authError) {
        console.error(`  FAILED to create auth user: ${authError.message}`);
        continue;
      }

      userId = newUser.user.id;
      console.log(`  Created auth user: ${userId}`);
      usersCreated++;
    }

    // 2. Compute taste vector from dominant genres
    const tasteVector = buildTasteVector(seedUser.dominantGenres);
    console.log(`  Dominant genres: ${seedUser.dominantGenres.join(', ')}`);
    console.log(`  Taste vector: [${tasteVector.map((v) => v.toFixed(1)).join(', ')}]`);

    // 3. Upsert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          display_name: seedUser.displayName,
          taste_vector: tasteVector,
          onboarding_completed: true,
          is_curator: true,
          curator_weight: 1.5,
          streak_count: 0,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error(`  FAILED to upsert profile: ${profileError.message}`);
      continue;
    }
    console.log(`  Profile upserted (is_curator=true, curator_weight=1.5)`);

    // 4. Clear existing recommendations for this user (idempotency)
    const { error: deleteError } = await supabaseAdmin
      .from('user_recommendations')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error(`  WARN: failed to clear old recommendations: ${deleteError.message}`);
    }

    // 5. Verify each track exists in DB, then insert recommendations
    const recs: {
      user_id: string;
      track_id: string;
      reason: string;
      used: boolean;
      is_curator_pick: boolean;
    }[] = [];

    for (const rec of seedUser.recommendations) {
      const { data: track } = await supabaseAdmin
        .from('tracks')
        .select('spotify_id, title, artist')
        .eq('spotify_id', rec.spotifyId)
        .single();

      if (!track) {
        console.warn(`  SKIP rec: track ${rec.spotifyId} not found in DB`);
        continue;
      }

      recs.push({
        user_id: userId,
        track_id: rec.spotifyId,
        reason: rec.reason,
        used: false,
        is_curator_pick: true,
      });

      console.log(`  + ${track.artist} — ${track.title}`);
    }

    if (recs.length > 0) {
      const { error: recError } = await supabaseAdmin
        .from('user_recommendations')
        .insert(recs);

      if (recError) {
        console.error(`  FAILED to insert recommendations: ${recError.message}`);
      } else {
        recsLoaded += recs.length;
        console.log(`  Loaded ${recs.length} recommendations`);
      }
    }

    console.log('');
  }

  // Summary
  const { count: totalRecs } = await supabaseAdmin
    .from('user_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('used', false);

  console.log('=== Summary ===');
  console.log(`Users created: ${usersCreated}`);
  console.log(`Users updated: ${usersUpdated}`);
  console.log(`Recommendations loaded: ${recsLoaded}`);
  console.log(`Total unused recommendations in pool: ${totalRecs ?? 'unknown'}`);
  console.log('Done!');
}

seedUsers().catch((err) => {
  console.error('Seed users failed:', err);
  process.exit(1);
});
