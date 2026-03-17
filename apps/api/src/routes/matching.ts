import { Router, Request, Response } from 'express';
import { runDailyMatching } from '../services/matching';

const router = Router();

// POST /api/admin/match — trigger daily matching
// Called by cron job or manually; protected by API key
router.post('/match', async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.CRON_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const summary = await runDailyMatching();
    res.json({ ok: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: 'Matching failed' });
  }
});

export default router;
