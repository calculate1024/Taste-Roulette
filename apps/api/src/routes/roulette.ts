import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { updateStreak } from '../services/streak';
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
      id, reason, taste_distance, status, delivered_at, opened_at,
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

  res.json({ ok: true, card_id: cardId });
});

export default router;
