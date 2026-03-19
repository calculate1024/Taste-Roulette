import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { updateStreak } from '../services/streak';
import { updateTasteVectorFromFeedback } from '../services/matching';
import { sendReactionEcho } from '../services/notifications';
import { trackEvent } from '../utils/analytics';
import { getTasteLabel } from '../utils/genres';
import { getTodayStartUTC8 } from '../utils/date';

const router = Router();

// GET /api/roulette/today — get today's roulette card for user
router.get('/today', async (req: Request, res: Response) => {
  const userId = req.userId!;

  const todayStart = getTodayStartUTC8();

  // Find today's card: pending (not yet delivered) or already delivered/opened today
  const { data: card, error } = await supabaseAdmin
    .from('roulette_cards')
    .select(`
      id, reason, taste_distance, recommender_taste_label, status, delivered_at, opened_at,
      tracks:track_id (spotify_id, title, artist, album, cover_url, spotify_url, genres)
    `)
    .eq('recipient_id', userId)
    .in('status', ['pending', 'delivered', 'opened'])
    .or(`status.eq.pending,delivered_at.gte.${todayStart.toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: 'Failed to fetch today\'s card' });
    return;
  }

  if (!card) {
    res.json({ card: null });
    return;
  }

  // If card is pending, mark as delivered
  if (card.status === 'pending') {
    const { error: updateError } = await supabaseAdmin
      .from('roulette_cards')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', card.id);

    if (updateError) {
      res.status(500).json({ error: 'Failed to update card status' });
      return;
    }

    card.status = 'delivered';
    card.delivered_at = new Date().toISOString();
  }

  res.json({
    card: {
      id: card.id,
      track: card.tracks,
      reason: card.reason,
      taste_distance: card.taste_distance,
      recommender_taste_label: (card as any).recommender_taste_label || null,
      status: card.status,
    },
  });
});

// POST /api/roulette/:cardId/open — mark card as opened
router.post('/:cardId/open', async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const userId = req.userId!;

  const { error } = await supabaseAdmin
    .from('roulette_cards')
    .update({ status: 'opened', opened_at: new Date().toISOString() })
    .eq('id', cardId)
    .eq('recipient_id', userId);

  if (error) {
    res.status(500).json({ error: 'Failed to mark card as opened' });
    return;
  }

  // Update streak count after marking card as opened
  const streakCount = await updateStreak(userId);

  trackEvent(userId, 'card_opened', { card_id: cardId, streak_count: streakCount });

  res.json({ ok: true, streak_count: streakCount });
});

// POST /api/roulette/:cardId/feedback — submit feedback for a card
router.post('/:cardId/feedback', async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const userId = req.userId!;
  const { reaction, comment } = req.body;

  if (!reaction) {
    res.status(400).json({ error: 'reaction required' });
    return;
  }

  const validReactions = ['surprised', 'okay', 'not_for_me'];
  if (!validReactions.includes(reaction)) {
    res.status(400).json({ error: `reaction must be one of: ${validReactions.join(', ')}` });
    return;
  }

  // Insert feedback
  const { error: feedbackError } = await supabaseAdmin
    .from('feedbacks')
    .insert({
      card_id: cardId,
      user_id: userId,
      reaction,
      comment: comment || null,
    });

  if (feedbackError) {
    res.status(500).json({ error: 'Failed to save feedback' });
    return;
  }

  // Update card status — only if this user is the recipient (ownership check)
  const { error: cardError } = await supabaseAdmin
    .from('roulette_cards')
    .update({ status: 'feedback_given' })
    .eq('id', cardId)
    .eq('recipient_id', userId);

  if (cardError) {
    res.status(500).json({ error: 'Failed to update card status' });
    return;
  }

  // Fetch card data for insight computation and echo
  const { data: cardData } = await supabaseAdmin
    .from('roulette_cards')
    .select('track_id, recommender_id, taste_distance')
    .eq('id', cardId)
    .single();

  // Compute taste vector update (micro-insight)
  let insightPayload = null;
  if (cardData?.track_id) {
    try {
      const insight = await updateTasteVectorFromFeedback(userId, cardData.track_id, reaction);
      insightPayload = {
        old_vector: insight.oldVector,
        new_vector: insight.newVector,
        dominant_shift: insight.dominantShift,
        genres_explored: insight.genresExplored,
        new_badge: insight.newBadge,
      };
    } catch (err) {
      console.warn('Insight computation failed:', err);
    }
  }

  // Trigger echo notification for 'surprised' reactions (fire and forget)
  if (reaction === 'surprised' && cardData?.recommender_id) {
    (async () => {
      try {
        const { data: track } = await supabaseAdmin
          .from('tracks')
          .select('title')
          .eq('spotify_id', cardData.track_id)
          .single();

        const { data: recipientProfile } = await supabaseAdmin
          .from('profiles')
          .select('taste_vector')
          .eq('id', userId)
          .single();

        const recipientLabel = recipientProfile?.taste_vector
          ? getTasteLabel(recipientProfile.taste_vector)
          : '音樂探索者';

        await sendReactionEcho(
          cardData.recommender_id!,
          track?.title || '未知曲目',
          recipientLabel
        );
      } catch (err) {
        console.warn('Echo notification failed:', err);
      }
    })();
  }

  trackEvent(userId, 'feedback_given', {
    card_id: cardId,
    reaction,
    taste_distance: cardData?.taste_distance,
  });

  res.json({ ok: true, card_id: cardId, insight: insightPayload });
});

// GET /api/roulette/yesterday-echo — check if user's recommendation got surprised feedback yesterday
// Optimized: 2 queries instead of 4-5 (was N+1 pattern)
router.get('/yesterday-echo', async (req: Request, res: Response) => {
  const userId = req.userId!;

  const todayStart = getTodayStartUTC8();
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  // Single query: find yesterday's 'surprised' feedbacks on cards this user recommended
  // Uses inner join: feedbacks → roulette_cards (filtered by recommender_id)
  const { data: echoFeedback } = await supabaseAdmin
    .from('feedbacks')
    .select(`
      card_id,
      roulette_cards!inner(
        track_id, recipient_id,
        tracks:track_id(title, artist, cover_url)
      )
    `)
    .eq('reaction', 'surprised')
    .eq('roulette_cards.recommender_id', userId)
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', todayStart.toISOString())
    .limit(1)
    .maybeSingle();

  if (!echoFeedback) {
    res.json({ echo: null });
    return;
  }

  const card = echoFeedback.roulette_cards as any;
  const track = card?.tracks;

  // One more query for recipient taste label
  let recipientLabel = '音樂探索者';
  if (card?.recipient_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('taste_vector')
      .eq('id', card.recipient_id)
      .single();
    if (profile?.taste_vector) {
      recipientLabel = getTasteLabel(profile.taste_vector);
    }
  }

  res.json({
    echo: {
      track_title: track?.title || '未知曲目',
      track_artist: track?.artist || '未知藝人',
      cover_url: track?.cover_url || null,
      recipient_taste_label: recipientLabel,
    },
  });
});

export default router;
