import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { getDominantGenres, getTasteLabel } from '../utils/genres';
import { cosineDistance } from '../utils/vector';

const router = Router();

/** Generate a stable anonymous ID from a user UUID. */
function anonymize(userId: string): string {
  // Use first 8 chars of UUID as anonymous identifier
  return userId.slice(0, 8);
}

// GET /api/twins — Get taste twins and complements
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get requesting user's taste vector
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('taste_vector')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.taste_vector || profile.taste_vector.length === 0) {
      res.json({ twins: [], complements: [] });
      return;
    }

    const userVector: number[] = profile.taste_vector;

    // TODO: This fetches all users into memory — acceptable for MVP but needs
    // database-level distance calculation (e.g., pgvector) for production scale

    // Get all other users with taste vectors
    const { data: otherUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, taste_vector')
      .eq('onboarding_completed', true)
      .neq('id', userId);

    if (usersError || !otherUsers || otherUsers.length === 0) {
      res.json({ twins: [], complements: [] });
      return;
    }

    // Calculate distances for all users
    const scored = otherUsers
      .filter((u: any) => u.taste_vector && u.taste_vector.length > 0 &&
        u.taste_vector.some((v: number) => v !== 0))
      .map((u: any) => ({
        id: u.id,
        tasteVector: u.taste_vector as number[],
        distance: cosineDistance(userVector, u.taste_vector),
      }));

    // Twins: closest taste vectors (min distance 0.01 to avoid numerical artifacts)
    const twins = scored
      .filter((s) => s.distance >= 0.01)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map((s) => ({
        anonymousId: anonymize(s.id),
        tasteLabel: getTasteLabel(s.tasteVector),
        distance: Math.round(s.distance * 1000) / 1000,
        dominantGenres: getDominantGenres(s.tasteVector),
      }));

    // Complements: distance in 0.5-0.7 range, sorted by closest to 0.6
    const complements = scored
      .filter((s) => s.distance >= 0.5 && s.distance <= 0.7)
      .sort((a, b) => Math.abs(a.distance - 0.6) - Math.abs(b.distance - 0.6))
      .slice(0, 3)
      .map((s) => ({
        anonymousId: anonymize(s.id),
        tasteLabel: getTasteLabel(s.tasteVector),
        distance: Math.round(s.distance * 1000) / 1000,
        dominantGenres: getDominantGenres(s.tasteVector),
      }));

    res.json({ twins, complements });
  } catch (err) {
    console.error('Error fetching taste twins:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
