import type { Router } from 'express';
import type { Deps } from '../deps.js';
import { paginationQuery } from '../lib/pagination.js';
import { parseOrThrow, uuidParam } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import type { RateLimiters } from '../middleware/rate-limit.js';
import { checkout, checkoutInput, idempotencyKeySchema } from '../services/checkout.service.js';
import {
  cancelMyOrder,
  getMyOrder,
  listMyOrders,
  payMyOrder,
  syncMyOrder,
} from '../services/orders.service.js';

/** Checkout and the customer's own orders. */
export function registerOrderRoutes(router: Router, deps: Deps, limiters: RateLimiters) {
  const auth = requireAuth(deps);

  router.post('/checkout', auth, limiters.checkout, async (req, res) => {
    const input = parseOrThrow(checkoutInput, req.body);
    const rawKey = req.get('idempotency-key');
    const key = rawKey === undefined ? undefined : parseOrThrow(idempotencyKeySchema, rawKey);
    const result = await checkout(deps, req.user!, input, key);
    if (result.replayed) res.setHeader('Idempotent-Replayed', 'true');
    res.status(result.replayed ? 200 : 201).json({
      order: result.order,
      paymentUrl: result.paymentUrl,
    });
  });

  router.get('/orders', auth, async (req, res) => {
    res.json(await listMyOrders(deps, req.user!.id, parseOrThrow(paginationQuery, req.query)));
  });
  router.get('/orders/:id', auth, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await getMyOrder(deps, req.user!.id, id));
  });
  router.post('/orders/:id/cancel', auth, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await cancelMyOrder(deps, req.user!.id, id));
  });
  router.post('/orders/:id/pay', auth, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await payMyOrder(deps, req.user!.id, id));
  });
  router.post('/orders/:id/sync', auth, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await syncMyOrder(deps, req.user!.id, id));
  });
}
