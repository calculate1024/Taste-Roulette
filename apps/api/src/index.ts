import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import * as Sentry from '@sentry/node';
import { PostHog } from 'posthog-node';
import { authMiddleware } from './middleware/auth';
import onboardingRouter from './routes/onboarding';
import notificationsRouter from './routes/notifications';
import rouletteRouter from './routes/roulette';
import recommendRouter from './routes/recommend';
import profileRouter from './routes/profile';
import matchingRouter from './routes/matching';
import { runDailyMatching } from './services/matching';
import { sendDailyNotifications } from './services/notifications';
import spotifyAuthRouter from './routes/spotify-auth';
import curatorRouter from './routes/curator';
import shareRouter from './routes/share';
import twinsRouter from './routes/twins';
import healthRouter from './routes/health';
import referralRouter from './routes/referral';
import landingRouter from './routes/landing';
import wellKnownRouter from './routes/well-known';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Initialize Sentry
const SENTRY_DSN = process.env.SENTRY_DSN || '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: process.env.NODE_ENV || 'development',
  });
}

// Initialize PostHog
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || '';
export const posthog = POSTHOG_API_KEY
  ? new PostHog(POSTHOG_API_KEY, { host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com' })
  : null;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Landing page + privacy policy (public, no auth)
app.use('/', landingRouter);

// .well-known (Universal Links / App Links)
app.use('/.well-known', wellKnownRouter);

// Protected routes (require auth)
app.use('/api/onboarding', authMiddleware, onboardingRouter);
app.use('/api/roulette', authMiddleware, rouletteRouter);
app.use('/api/recommend', authMiddleware, recommendRouter);
app.use('/api/profile', authMiddleware, profileRouter);
app.use('/api/spotify', spotifyAuthRouter); // has mix of public/protected
app.use('/api/curator', authMiddleware, curatorRouter);
app.use('/api/twins', authMiddleware, twinsRouter);
app.use('/api/referral', authMiddleware, referralRouter);

// Public routes (no auth middleware)
app.use('/api/health', healthRouter);
app.use('/api/share', shareRouter);

// Invite deep link — redirects to app or store
app.get('/invite/:code', (req, res) => {
  const code = req.params.code.replace(/[^A-Za-z0-9]/g, '');
  res.send(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8" />
  <meta property="og:title" content="Join me on Taste Roulette" />
  <meta property="og:description" content="Discover music outside your comfort zone" />
  <meta name="twitter:card" content="summary" />
  <meta http-equiv="refresh" content="0;url=taste-roulette://referral/${code}" />
</head><body>
  <p>Opening Taste Roulette...</p>
  <p>Don't have the app? <a href="https://taste-roulette.vercel.app/">Download here</a></p>
</body></html>`);
});

// Admin routes (API key, no auth middleware)
app.use('/api/admin', matchingRouter);
app.use('/api/notifications', notificationsRouter);

// Vercel Cron route — called daily at UTC 00:00 (= UTC+8 08:00)
app.get('/api/cron/daily', async (req, res) => {
  // Verify Vercel cron secret (auto-injected as Authorization header)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET || process.env.CRON_API_KEY;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const matchingSummary = await runDailyMatching();
    const notificationsSent = await sendDailyNotifications();

    res.json({
      ok: true,
      matching: matchingSummary,
      notifications_sent: notificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Daily cron failed:', err);
    res.status(500).json({ error: 'Cron job failed', message: err.message });
  }
});

// Sentry error handler (must be after routes)
if (SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Flush PostHog on shutdown
process.on('SIGTERM', () => { posthog?.shutdown(); });

// Only listen when running locally (not on Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Taste Roulette API running on port ${PORT}`);
  });
}

export default app;
