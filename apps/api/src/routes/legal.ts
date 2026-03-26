// Legal pages — Privacy Policy and Terms of Service
// Served as HTML for App Store / Google Play compliance

import { Router } from 'express';

const router = Router();

router.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — Taste Roulette</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.7; }
    h1 { color: #6C5CE7; }
    h2 { color: #444; margin-top: 2em; }
    p, li { margin-bottom: 0.8em; }
    .updated { color: #888; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: March 26, 2026</p>

  <p>Taste Roulette ("we", "our", "the app") is a music discovery application. We respect your privacy and are committed to protecting your personal data.</p>

  <h2>1. Data We Collect</h2>
  <ul>
    <li><strong>Account data:</strong> Email address (for authentication)</li>
    <li><strong>Taste profile:</strong> Your music genre preferences and feedback on recommendations (stored as an anonymous numerical vector)</li>
    <li><strong>Usage data:</strong> App interactions (cards opened, feedback given, recommendations submitted) — collected via PostHog analytics</li>
    <li><strong>Spotify data (optional):</strong> If you connect Spotify, we read your top tracks and artists to improve taste profiling. We never modify your Spotify account.</li>
    <li><strong>Push notification token:</strong> Device token for sending daily notifications</li>
  </ul>

  <h2>2. How We Use Your Data</h2>
  <ul>
    <li>Match you with music recommendations from other users based on taste distance</li>
    <li>Compute your taste profile (a 21-dimensional genre vector)</li>
    <li>Send daily push notifications about new recommendations</li>
    <li>Improve the app experience through anonymized analytics</li>
  </ul>

  <h2>3. Data Sharing</h2>
  <p>We do not sell your personal data. Your recommendations are shared anonymously — other users see a taste label (e.g., "Jazz Curious"), never your name or email.</p>
  <p>Third-party services we use:</p>
  <ul>
    <li><strong>Supabase:</strong> Database and authentication (EU region available)</li>
    <li><strong>PostHog:</strong> Product analytics (anonymized events)</li>
    <li><strong>Sentry:</strong> Error tracking (crash reports, no personal data)</li>
    <li><strong>Expo:</strong> Push notifications delivery</li>
    <li><strong>Spotify:</strong> Music metadata and optional account linking</li>
  </ul>

  <h2>4. Data Retention</h2>
  <p>Your data is retained as long as your account is active. You can delete your account and all associated data at any time from the Profile page in the app.</p>

  <h2>5. Your Rights (GDPR)</h2>
  <ul>
    <li><strong>Access:</strong> View your data in the app (Profile + Taste Journey)</li>
    <li><strong>Deletion:</strong> Delete your account and all data (Profile → Delete Account)</li>
    <li><strong>Portability:</strong> Contact us to export your data</li>
    <li><strong>Rectification:</strong> Reset your taste profile via onboarding reset</li>
  </ul>

  <h2>6. Children's Privacy</h2>
  <p>Taste Roulette is not intended for children under 13. We do not knowingly collect data from children.</p>

  <h2>7. Security</h2>
  <p>We use industry-standard security measures including encrypted connections (HTTPS), Row Level Security on our database, and secure authentication via Supabase Auth.</p>

  <h2>8. Contact</h2>
  <p>For privacy inquiries: <a href="mailto:MusicTasteRoulette@gmail.com">MusicTasteRoulette@gmail.com</a></p>

  <h2>9. Changes</h2>
  <p>We may update this policy. Significant changes will be communicated via in-app notification.</p>
</body>
</html>`);
});

router.get('/terms', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service — Taste Roulette</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.7; }
    h1 { color: #6C5CE7; }
    h2 { color: #444; margin-top: 2em; }
    p, li { margin-bottom: 0.8em; }
    .updated { color: #888; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Terms of Service</h1>
  <p class="updated">Last updated: March 26, 2026</p>

  <p>By using Taste Roulette, you agree to these terms.</p>

  <h2>1. The Service</h2>
  <p>Taste Roulette is a free music discovery app that delivers one anonymous music recommendation per day. The service is provided as-is.</p>

  <h2>2. User Conduct</h2>
  <ul>
    <li>Recommendations must be genuine music suggestions</li>
    <li>Do not submit offensive, harmful, or spam content in recommendation reasons</li>
    <li>One account per person</li>
  </ul>

  <h2>3. Content</h2>
  <p>Music metadata and previews are provided by Spotify. We do not host or distribute copyrighted music. Playback occurs through Spotify's official embed player or app.</p>

  <h2>4. Account Deletion</h2>
  <p>You can delete your account at any time from the Profile page. This permanently removes all your data including taste profile, feedback history, and recommendations.</p>

  <h2>5. Limitation of Liability</h2>
  <p>Taste Roulette is a side project provided without warranty. We are not liable for any damages arising from use of the service.</p>

  <h2>6. Contact</h2>
  <p><a href="mailto:MusicTasteRoulette@gmail.com">MusicTasteRoulette@gmail.com</a></p>
</body>
</html>`);
});

export default router;
