import { Router, Request, Response } from 'express';

const router = Router();

const APP_NAME = 'Taste Roulette';
const TAGLINE = 'Discover music outside your comfort zone';
const DESCRIPTION =
  'An anti-algorithm music app. Every day, receive one song recommended by a stranger whose taste is different from yours — but not too far.';
const OG_IMAGE = 'https://taste-roulette.vercel.app/og-image.png';
const APP_STORE_URL = '#'; // TODO: replace after App Store approval
const PLAY_STORE_URL = '#'; // TODO: replace after Google Play approval
const CONTACT_EMAIL = 'hello@tasteroulette.app';

// GET / — Landing page
router.get('/', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${APP_NAME} — ${TAGLINE}</title>
  <meta name="description" content="${DESCRIPTION}" />
  <meta property="og:title" content="${APP_NAME}" />
  <meta property="og:description" content="${DESCRIPTION}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${APP_NAME}" />
  <meta name="twitter:description" content="${DESCRIPTION}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a; color: #f5f5f5;
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 2rem;
      text-align: center;
    }
    .hero { max-width: 600px; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    h1 span { color: #6C5CE7; }
    .tagline { font-size: 1.25rem; color: #aaa; margin-bottom: 2rem; }
    .description { font-size: 1rem; color: #ccc; line-height: 1.6; margin-bottom: 2.5rem; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1.5rem; margin-bottom: 2.5rem; text-align: left; }
    .feature { background: #1a1a1a; border-radius: 12px; padding: 1.25rem; }
    .feature h3 { font-size: 0.95rem; margin-bottom: 0.5rem; }
    .feature p { font-size: 0.85rem; color: #999; line-height: 1.4; }
    .cta { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2rem; }
    .cta a {
      display: inline-block; padding: 0.75rem 1.5rem; border-radius: 8px;
      text-decoration: none; font-weight: 600; font-size: 0.95rem;
    }
    .cta-primary { background: #6C5CE7; color: #fff; }
    .cta-secondary { background: #222; color: #f5f5f5; border: 1px solid #333; }
    footer { margin-top: 3rem; font-size: 0.8rem; color: #666; }
    footer a { color: #888; }
  </style>
</head>
<body>
  <div class="hero">
    <h1><span>Taste</span> Roulette</h1>
    <p class="tagline">${TAGLINE}</p>
    <p class="description">${DESCRIPTION}</p>
    <div class="features">
      <div class="feature">
        <h3>One card per day</h3>
        <p>No infinite feed. Just one carefully matched song to expand your horizons.</p>
      </div>
      <div class="feature">
        <h3>Anti-algorithm</h3>
        <p>We maximize surprise, not accuracy. Discover what you never knew you'd love.</p>
      </div>
      <div class="feature">
        <h3>From real people</h3>
        <p>Every recommendation comes from a real person, not a machine.</p>
      </div>
      <div class="feature">
        <h3>Anonymous &amp; safe</h3>
        <p>No names shown. Only taste labels like "jazz lover" or "electronic explorer".</p>
      </div>
    </div>
    <div class="cta">
      <a href="${APP_STORE_URL}" class="cta-primary">Download for iOS</a>
      <a href="${PLAY_STORE_URL}" class="cta-secondary">Download for Android</a>
    </div>
  </div>
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${APP_NAME} &middot;
      <a href="/privacy">Privacy Policy</a> &middot;
      <a href="mailto:${CONTACT_EMAIL}">Contact</a>
    </p>
  </footer>
</body>
</html>`);
});

// GET /privacy — Privacy Policy
router.get('/privacy', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy — ${APP_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a; color: #ddd; max-width: 720px; margin: 0 auto;
      padding: 2rem 1.5rem; line-height: 1.7;
    }
    h1 { font-size: 1.8rem; margin-bottom: 0.5rem; color: #f5f5f5; }
    h2 { font-size: 1.2rem; margin-top: 2rem; margin-bottom: 0.5rem; color: #f5f5f5; }
    p, li { font-size: 0.95rem; color: #bbb; margin-bottom: 0.75rem; }
    ul { padding-left: 1.5rem; }
    a { color: #6C5CE7; }
    .updated { font-size: 0.85rem; color: #666; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: March 19, 2026</p>

  <h2>1. Information We Collect</h2>
  <p>${APP_NAME} collects the following information:</p>
  <ul>
    <li><strong>Email address</strong> — for account authentication</li>
    <li><strong>Music taste preferences</strong> — your reactions during onboarding and daily feedback</li>
    <li><strong>Recommendations you submit</strong> — song choices and short text reasons</li>
    <li><strong>Push notification tokens</strong> — to deliver your daily card</li>
  </ul>

  <h2>2. How We Use Your Information</h2>
  <ul>
    <li>To authenticate your account and provide the service</li>
    <li>To compute your taste vector and match you with appropriate recommendations</li>
    <li>To send you daily push notifications with your recommendation card</li>
    <li>To generate anonymized statistics (e.g., "67% of users were surprised")</li>
  </ul>

  <h2>3. Third-Party Services</h2>
  <p>We use the following services that may process your data:</p>
  <ul>
    <li><strong>Supabase</strong> (database &amp; authentication) — <a href="https://supabase.com/privacy">privacy policy</a></li>
    <li><strong>PostHog</strong> (product analytics) — <a href="https://posthog.com/privacy">privacy policy</a></li>
    <li><strong>Sentry</strong> (error tracking) — <a href="https://sentry.io/privacy/">privacy policy</a></li>
    <li><strong>Spotify</strong> (music metadata) — <a href="https://www.spotify.com/privacy">privacy policy</a></li>
    <li><strong>Expo</strong> (push notifications) — <a href="https://expo.dev/privacy">privacy policy</a></li>
  </ul>

  <h2>4. Data Sharing</h2>
  <p>We do not sell your personal data. Your recommendations are shared anonymously with other users — only taste labels (e.g., "jazz lover") are shown, never your name or email.</p>

  <h2>5. Data Retention</h2>
  <p>We retain your data for as long as your account is active. You can delete your account and all associated data at any time from the app settings.</p>

  <h2>6. Account Deletion</h2>
  <p>You can permanently delete your account through the app's profile settings. This removes all your data including your profile, taste preferences, recommendations, feedback, and authentication credentials. This action is irreversible.</p>

  <h2>7. Your Rights (GDPR)</h2>
  <p>If you are in the European Economic Area, you have the right to:</p>
  <ul>
    <li>Access your personal data</li>
    <li>Correct inaccurate data</li>
    <li>Request deletion of your data</li>
    <li>Object to data processing</li>
    <li>Data portability</li>
  </ul>
  <p>Contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> to exercise these rights.</p>

  <h2>8. Children's Privacy</h2>
  <p>${APP_NAME} is not intended for children under 13. We do not knowingly collect data from children.</p>

  <h2>9. Changes to This Policy</h2>
  <p>We may update this policy. Changes will be posted on this page with an updated date.</p>

  <h2>10. Contact</h2>
  <p>For questions about this policy, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

  <p style="margin-top: 2rem;"><a href="/">&larr; Back to ${APP_NAME}</a></p>
</body>
</html>`);
});

export default router;
