import { Router, Request, Response } from 'express';
import { sendDailyNotifications } from '../services/notifications';

const router = Router();

// POST /api/notifications/daily — trigger daily push notifications
// Called by cron job or manually; protected by API key
router.post('/daily', async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.CRON_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const count = await sendDailyNotifications();
  res.json({ ok: true, sent: count });
});

export default router;
