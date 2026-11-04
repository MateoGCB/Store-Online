import { Router } from 'express';
import type { Deps } from '../deps.js';
import { registerHealthRoute } from './health.routes.js';

/**
 * All API routes live on ONE router with their full path (relative to /api/v1), so the
 * OpenAPI test can list every registered route and check that it is documented.
 */
export function buildApiRouter(deps: Deps): Router {
  const router = Router();
  registerHealthRoute(router, deps);
  return router;
}
