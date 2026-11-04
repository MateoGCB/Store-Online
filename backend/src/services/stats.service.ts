import type { Deps } from '../deps.js';
import type { OrderStatus } from '../generated/prisma/client.js';
import { ORDER_STATUSES } from './orders.service.js';
import { expireOverdueOrders } from './stock.service.js';

export const LOW_STOCK_THRESHOLD = 5;
const SOLD_STATUSES: OrderStatus[] = [
  'PAID',
  'PREPARING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'DELIVERED',
];

export async function getStats(deps: Deps) {
  await expireOverdueOrders(deps);
  const now = deps.clock.now();
  const since = new Date(now.getTime() - 30 * 24 * 3600_000);

  const [byStatus, sales, lowStock, attention] = await Promise.all([
    deps.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    deps.prisma.order.aggregate({
      where: { status: { in: SOLD_STATUSES }, paidAt: { gte: since } },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    deps.prisma.product.findMany({
      where: { archivedAt: null, stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, stock: true, reserved: true, active: true },
    }),
    deps.prisma.order.count({ where: { needsAttention: true } }),
  ]);

  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;
  for (const row of byStatus) ordersByStatus[row.status] = row._count._all;

  return {
    ordersByStatus,
    ordersNeedingAttention: attention,
    last30Days: {
      from: since.toISOString(),
      to: now.toISOString(),
      paidOrders: sales._count._all,
      salesCents: sales._sum.totalCents ?? 0,
    },
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    lowStockProducts: lowStock,
  };
}
