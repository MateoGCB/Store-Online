import { Router } from 'express';
import type { Deps } from '../deps.js';
import type { RateLimiters } from '../middleware/rate-limit.js';
import { registerAdminOrderRoutes } from './admin-orders.routes.js';
import { registerAdminRoutes } from './admin.routes.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerCartRoutes } from './cart.routes.js';
import { registerCatalogRoutes } from './catalog.routes.js';
import { registerHealthRoute } from './health.routes.js';
import { registerOrderRoutes } from './orders.routes.js';
import { registerWebhookRoutes } from './webhooks.routes.js';

/**
 * All API routes live on ONE router with their full path (relative to /api/v1), so the
 * OpenAPI test can list every registered route and check that it is documented.
 */
export function buildApiRouter(deps: Deps, limiters: RateLimiters): Router {
  const router = Router();
  registerHealthRoute(router, deps);
  registerAuthRoutes(router, deps, limiters);
  registerCatalogRoutes(router, deps);
  registerAdminRoutes(router, deps);
  registerCartRoutes(router, deps);
  registerOrderRoutes(router, deps, limiters);
  registerAdminOrderRoutes(router, deps);
  registerWebhookRoutes(router, deps);
  return router;
}
