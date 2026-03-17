import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authMiddleware } from './middleware/auth';
import onboardingRouter from './routes/onboarding';
import notificationsRouter from './routes/notifications';
import rouletteRouter from './routes/roulette';
import recommendRouter from './routes/recommend';
import profileRouter from './routes/profile';
import matchingRouter from './routes/matching';
import spotifyAuthRouter from './routes/spotify-auth';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes (require auth)
app.use('/api/onboarding', authMiddleware, onboardingRouter);
app.use('/api/roulette', authMiddleware, rouletteRouter);
app.use('/api/recommend', authMiddleware, recommendRouter);
app.use('/api/profile', authMiddleware, profileRouter);
app.use('/api/spotify', spotifyAuthRouter); // has mix of public/protected

// Admin routes (API key, no auth middleware)
app.use('/api/admin', matchingRouter);
app.use('/api/notifications', notificationsRouter);

app.listen(PORT, () => {
  console.log(`Taste Roulette API running on port ${PORT}`);
});
