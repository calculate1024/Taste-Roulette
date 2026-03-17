import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';

const router = Router();

/**
 * Escape HTML entities to prevent XSS in OG meta tags.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// GET /api/share/:cardId — Returns HTML with Open Graph meta tags for social previews
router.get('/:cardId', async (req: Request<{ cardId: string }>, res: Response) => {
  const { cardId } = req.params;

  const { data: card, error } = await supabaseAdmin
    .from('roulette_cards')
    .select(`
      track_id, taste_distance,
      tracks:track_id (title, artist, cover_url)
    `)
    .eq('id', cardId)
    .maybeSingle();

  if (error || !card || !card.tracks) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const track = card.tracks as unknown as {
    title: string;
    artist: string;
    cover_url: string;
  };

  const title = escapeHtml(track.title);
  const artist = escapeHtml(track.artist);
  const coverUrl = escapeHtml(track.cover_url ?? '');
  const tastePercent = Math.round((card.taste_distance ?? 0.5) * 100);

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta property="og:title" content="${title} - ${artist}" />
  <meta property="og:description" content="品味距離 ${tastePercent}% 的推薦" />
  <meta property="og:image" content="${coverUrl}" />
  <meta property="og:url" content="https://taste-roulette.app/share/${escapeHtml(cardId)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title} - ${artist}" />
  <meta name="twitter:description" content="品味距離 ${tastePercent}% 的推薦" />
  <meta name="twitter:image" content="${coverUrl}" />
  <meta http-equiv="refresh" content="0;url=taste-roulette://card/${escapeHtml(cardId)}" />
</head>
<body>
  <p>Redirecting to Taste Roulette...</p>
</body>
</html>`);
});

export default router;
