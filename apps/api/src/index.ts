import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route placeholders — will be replaced with actual routers
const placeholderRoutes = ['/api/onboarding', '/api/roulette', '/api/recommend', '/api/profile'];
for (const route of placeholderRoutes) {
  app.use(route, (_req, res) => {
    res.json({ message: `${route} - not implemented` });
  });
}

app.listen(PORT, () => {
  console.log(`Taste Roulette API running on port ${PORT}`);
});
