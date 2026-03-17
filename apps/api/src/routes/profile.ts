import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';

const router = Router();

// GET /api/profile/me — get user profile and stats
router.get('/me', async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Fetch user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('display_name, streak_count')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    res.status(500).json({ error: 'Failed to fetch profile' });
    return;
  }

  if (!profile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Count total cards received
  const { count: totalCards } = await supabaseAdmin
    .from('roulette_cards')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId);

  // Count total "surprised" reactions
  const { count: totalSurprises } = await supabaseAdmin
    .from('feedbacks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('reaction', 'surprised');

  // Count total recommendations submitted
  const { count: totalRecommendations } = await supabaseAdmin
    .from('user_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  res.json({
    profile: {
      display_name: profile.display_name,
      streak_count: profile.streak_count,
      stats: {
        total_cards: totalCards ?? 0,
        total_surprises: totalSurprises ?? 0,
        total_recommendations: totalRecommendations ?? 0,
      },
    },
  });
});

// GET /api/profile/taste-journey — get taste journey data for radar chart + badges
router.get('/taste-journey', async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Fetch taste vector and streak from profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('taste_vector, streak_count')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    res.status(500).json({ error: 'Failed to fetch profile' });
    return;
  }

  if (!profile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Total cards received
  const { count: totalCards } = await supabaseAdmin
    .from('roulette_cards')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId);

  // Surprised reactions
  const { count: surprisedCount } = await supabaseAdmin
    .from('feedbacks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('reaction', 'surprised');

  // Total recommendations submitted
  const { count: totalRecommendations } = await supabaseAdmin
    .from('user_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Max taste distance from received cards
  const { data: maxDistRow } = await supabaseAdmin
    .from('roulette_cards')
    .select('taste_distance')
    .eq('recipient_id', userId)
    .not('taste_distance', 'is', null)
    .order('taste_distance', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Distinct genres from tracks received via roulette cards
  const { data: receivedTracks } = await supabaseAdmin
    .from('roulette_cards')
    .select('tracks:track_id(genres)')
    .eq('recipient_id', userId);

  const genreSet = new Set<string>();
  if (receivedTracks) {
    for (const row of receivedTracks) {
      const track = row.tracks as unknown as { genres: string[] } | null;
      if (track?.genres) {
        for (const g of track.genres) {
          genreSet.add(g);
        }
      }
    }
  }

  res.json({
    tasteVector: profile.taste_vector ?? [],
    stats: {
      totalCards: totalCards ?? 0,
      surprisedCount: surprisedCount ?? 0,
      streakCount: profile.streak_count ?? 0,
      genresExplored: genreSet.size,
      totalRecommendations: totalRecommendations ?? 0,
      maxTasteDistance: maxDistRow?.taste_distance ?? 0,
    },
  });
});

export default router;
