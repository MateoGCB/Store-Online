import type { Router } from 'express';
import type { Deps } from '../deps.js';
import { parseOrThrow, uuidParam } from '../lib/validation.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  adminCancelInput,
  adminOrdersQuery,
  cancelPaidOrder,
  changeOrderStatus,
  changeStatusInput,
  getAdminOrder,
  listAdminOrders,
  resolveAttention,
} from '../services/orders.service.js';
import { getStats } from '../services/stats.service.js';

/** Order administration (state machine, cancellations) and sales stats. */
export function registerAdminOrderRoutes(router: Router, deps: Deps) {
  const admin = requireAdmin(deps);

  router.get('/admin/stats', admin, async (_req, res) => {
    res.json(await getStats(deps));
  });

  router.get('/admin/orders', admin, async (req, res) => {
    res.json(await listAdminOrders(deps, parseOrThrow(adminOrdersQuery, req.query)));
  });
  router.get('/admin/orders/:id', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await getAdminOrder(deps, id));
  });
  router.patch('/admin/orders/:id/status', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await changeOrderStatus(deps, id, parseOrThrow(changeStatusInput, req.body)));
  });
  router.post('/admin/orders/:id/cancel', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    const input = parseOrThrow(adminCancelInput, req.body);
    res.json(await cancelPaidOrder(deps, id, req.user!.id, input));
  });
  router.post('/admin/orders/:id/resolve-attention', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await resolveAttention(deps, id));
  });
}
