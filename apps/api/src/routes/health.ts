import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';

const router = Router();

// GET /api/health — system health check for monitoring
router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  const start = Date.now();

  // Check Supabase connectivity
  try {
    const dbStart = Date.now();
    const { count, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
    const dbLatency = Date.now() - dbStart;

    if (error) {
      checks.database = { status: 'unhealthy', error: error.message, latencyMs: dbLatency };
    } else {
      checks.database = { status: 'healthy', latencyMs: dbLatency };
    }
  } catch (err: any) {
    checks.database = { status: 'unhealthy', error: err.message };
  }

  // Overall status
  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  const totalLatency = Date.now() - start;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    latencyMs: totalLatency,
    checks,
  });
});

export default router;
