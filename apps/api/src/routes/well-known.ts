import { Router, Request, Response } from 'express';

const router = Router();

const BUNDLE_ID = 'com.tasteroulette.app';
const TEAM_ID = process.env.APPLE_TEAM_ID || 'XXXXXXXXXX'; // TODO: replace with real Apple Team ID
const ANDROID_PACKAGE = 'com.tasteroulette.app';
const ANDROID_SHA256 = process.env.ANDROID_SHA256_FINGERPRINT || ''; // TODO: from signing key

// Apple App Site Association — enables Universal Links on iOS
router.get('/apple-app-site-association', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    applinks: {
      details: [
        {
          appIDs: [`${TEAM_ID}.${BUNDLE_ID}`],
          components: [
            { '/': '/share/*', comment: 'Shared roulette cards' },
            { '/': '/invite/*', comment: 'Referral invite links' },
          ],
        },
      ],
    },
  });
});

// Android Digital Asset Links — enables App Links on Android
router.get('/assetlinks.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: ANDROID_SHA256 ? [ANDROID_SHA256] : [],
      },
    },
  ]);
});

export default router;
