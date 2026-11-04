import type { Router } from 'express';
import type { Deps } from '../deps.js';

export function registerHealthRoute(router: Router, deps: Deps) {
  router.get('/health', async (_req, res) => {
    try {
      await deps.prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'ok', time: deps.clock.now().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unavailable' });
    }
  });
}
