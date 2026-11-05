import type { Router } from 'express';
import type { Deps } from '../deps.js';
import { parseOrThrow, uuidParam } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { simulatePayment, simulatePaymentInput } from '../services/simulated-payments.service.js';

/**
 * Development-only routes. They are registered ONLY when PAYMENTS_PROVIDER=fake, which the
 * environment validation forbids in production.
 */
export function registerDevRoutes(router: Router, deps: Deps) {
  // Lets the store detect demo mode (the route only exists when payments are simulated).
  router.get('/dev/status', (_req, res) => {
    res.json({ paymentsProvider: deps.env.PAYMENTS_PROVIDER });
  });

  router.post('/dev/orders/:id/simulate-payment', requireAuth(deps), async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    const { outcome } = parseOrThrow(simulatePaymentInput, req.body);
    res.json(await simulatePayment(deps, req.user!.id, id, outcome));
  });
}
