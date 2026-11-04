import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createProduct,
  createTestContext,
  insertOrder,
  loggedIn,
  productState,
  resetDb,
  type Client,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
let admin: Client;
let customerId: string;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => ctx.close());
beforeEach(async () => {
  await resetDb(ctx);
  admin = (await loggedIn(ctx, { role: 'ADMIN' })).client;
  customerId = (await loggedIn(ctx)).user.id;
});

const STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PREPARING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
] as const;
type Status = (typeof STATUSES)[number];

/** Hand-written list of every allowed transition through PATCH /status. Everything else is invalid. */
const ALLOWED: Array<[from: Status, to: Status, fulfillment: 'PICKUP' | 'DELIVERY']> = [
  ['PAID', 'PREPARING', 'PICKUP'],
  ['PAID', 'PREPARING', 'DELIVERY'],
  ['PREPARING', 'READY_FOR_PICKUP', 'PICKUP'],
  ['PREPARING', 'SHIPPED', 'DELIVERY'],
  ['READY_FOR_PICKUP', 'DELIVERED', 'PICKUP'],
  ['SHIPPED', 'DELIVERED', 'DELIVERY'],
];

describe('order state machine', () => {
  const allCases: Array<[Status, Status, 'PICKUP' | 'DELIVERY', boolean]> = [];
  for (const fulfillment of ['PICKUP', 'DELIVERY'] as const) {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        const ok = ALLOWED.some(([f, t, ful]) => f === from && t === to && ful === fulfillment);
        allCases.push([from, to, fulfillment, ok]);
      }
    }
  }

  it(`checks all ${allCases.length} combinations against the hand-written table`, async () => {
    const product = await createProduct(ctx, { stock: 1000 });
    const failures: string[] = [];
    for (const [from, to, fulfillment, ok] of allCases) {
      const order = await insertOrder(ctx, {
        userId: customerId,
        productId: product.id,
        status: from,
        fulfillment,
        paidAt: from === 'PENDING_PAYMENT' || from === 'EXPIRED' ? null : new Date(),
      });
      const res = await admin.patch(`/admin/orders/${order.id}/status`, { status: to });
      const stored = await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      const expectedStatus = ok ? 200 : 409;
      const expectedFinal = ok ? to : from;
      if (res.status !== expectedStatus || stored.status !== expectedFinal) {
        failures.push(`${fulfillment} ${from} -> ${to}: got ${res.status}, final ${stored.status}`);
      }
      if (!ok && res.body.error?.code !== 'INVALID_STATUS_TRANSITION') {
        failures.push(`${fulfillment} ${from} -> ${to}: code ${res.body.error?.code}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('two concurrent changes of the same order: one wins, the other gets 409', async () => {
    const product = await createProduct(ctx);
    const order = await insertOrder(ctx, {
      userId: customerId,
      productId: product.id,
      status: 'PAID',
      paidAt: new Date(),
    });
    const results = await Promise.all([
      admin.patch(`/admin/orders/${order.id}/status`, { status: 'PREPARING', fromStatus: 'PAID' }),
      admin.patch(`/admin/orders/${order.id}/status`, { status: 'PREPARING', fromStatus: 'PAID' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(['ORDER_STATUS_CHANGED', 'INVALID_STATUS_TRANSITION']).toContain(loser.body.error.code);
  });

  it('fromStatus that does not match the current status answers 409 ORDER_STATUS_CHANGED', async () => {
    const product = await createProduct(ctx);
    const order = await insertOrder(ctx, {
      userId: customerId,
      productId: product.id,
      status: 'PREPARING',
      paidAt: new Date(),
    });
    const res = await admin.patch(`/admin/orders/${order.id}/status`, {
      status: 'READY_FOR_PICKUP',
      fromStatus: 'PAID',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_STATUS_CHANGED');
    expect((await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      'PREPARING',
    );
  });
});

describe('admin cancellation', () => {
  it.each(['PAID', 'PREPARING', 'READY_FOR_PICKUP'] as const)(
    'cancels from %s, returns units to stock and flags a manual refund',
    async (status) => {
      const product = await createProduct(ctx, { stock: 7 });
      const order = await insertOrder(ctx, {
        userId: customerId,
        productId: product.id,
        quantity: 3,
        status,
        paidAt: new Date(),
      });
      const res = await admin.post(`/admin/orders/${order.id}/cancel`, {
        reason: 'Sin stock real',
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'CANCELLED',
        cancelReason: 'Sin stock real',
        needsAttention: true,
      });
      expect(await productState(ctx, product.id)).toEqual({ stock: 10, reserved: 0 });
      const movements = await ctx.prisma.stockMovement.findMany({ where: { orderId: order.id } });
      expect(movements.map((m) => [m.reason, m.delta])).toEqual([['CANCEL_RESTOCK', 3]]);
    },
  );

  it.each(['PENDING_PAYMENT', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'EXPIRED'] as const)(
    'cannot cancel from %s',
    async (status) => {
      const product = await createProduct(ctx, { stock: 7 });
      const order = await insertOrder(ctx, { userId: customerId, productId: product.id, status });
      const res = await admin.post(`/admin/orders/${order.id}/cancel`, { reason: 'x' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
      expect(await productState(ctx, product.id)).toEqual({ stock: 7, reserved: 0 });
    },
  );

  it('requires a reason', async () => {
    const product = await createProduct(ctx);
    const order = await insertOrder(ctx, {
      userId: customerId,
      productId: product.id,
      status: 'PAID',
    });
    expect((await admin.post(`/admin/orders/${order.id}/cancel`, {})).status).toBe(400);
  });

  it('resolve-attention clears the flag', async () => {
    const product = await createProduct(ctx);
    const order = await insertOrder(ctx, {
      userId: customerId,
      productId: product.id,
      status: 'PAID',
    });
    await admin.post(`/admin/orders/${order.id}/cancel`, { reason: 'x' });
    const res = await admin.post(`/admin/orders/${order.id}/resolve-attention`);
    expect(res.body.needsAttention).toBe(false);
  });
});

describe('admin order listing', () => {
  it('filters by status, number, date range and needsAttention, newest first', async () => {
    const product = await createProduct(ctx);
    const at = (iso: string) => new Date(iso);
    const o1 = await insertOrder(ctx, {
      userId: customerId,
      productId: product.id,
      status: 'PAID',
    });
    const o2 = await insertOrder(ctx, {
      userId: customerId,
      productId: product.id,
      status: 'DELIVERED',
    });
    const o3 = await insertOrder(ctx, {
      userId: customerId,
      productId: product.id,
      status: 'PAID',
    });
    await ctx.prisma.order.update({
      where: { id: o1.id },
      data: { createdAt: at('2026-10-01T10:00:00Z') },
    });
    await ctx.prisma.order.update({
      where: { id: o2.id },
      data: { createdAt: at('2026-10-15T10:00:00Z') },
    });
    await ctx.prisma.order.update({
      where: { id: o3.id },
      data: { createdAt: at('2026-11-01T10:00:00Z'), needsAttention: true },
    });
    const ids = async (q: string) =>
      (await admin.get(`/admin/orders${q}`)).body.items.map((o: { id: string }) => o.id);

    expect(await ids('')).toEqual([o3.id, o2.id, o1.id]);
    expect(await ids('?status=PAID')).toEqual([o3.id, o1.id]);
    expect(await ids(`?number=${o2.number}`)).toEqual([o2.id]);
    expect(await ids('?from=2026-10-10T00:00:00Z&to=2026-10-31T23:59:59Z')).toEqual([o2.id]);
    expect(await ids('?needsAttention=true')).toEqual([o3.id]);
    const page = await admin.get('/admin/orders?pageSize=2');
    expect(page.body).toMatchObject({ page: 1, pageSize: 2, total: 3 });
    expect((await admin.get('/admin/orders?status=WHATEVER')).status).toBe(400);

    const detail = await admin.get(`/admin/orders/${o1.id}`);
    expect(detail.body.customer.id).toBe(customerId);
    expect(detail.body.payments).toHaveLength(1);
    expect((await admin.get('/admin/orders/00000000-0000-4000-8000-000000000000')).status).toBe(
      404,
    );
  });
});

describe('stats', () => {
  it('reports orders by status, sales of the last 30 days and low stock', async () => {
    const low = await createProduct(ctx, { name: 'Poco', stock: 5 });
    await createProduct(ctx, { name: 'Mucho', stock: 6 });
    await createProduct(ctx, { name: 'Archivado', stock: 0, archived: true });
    const now = ctx.clock.now();
    const days = (n: number) => new Date(now.getTime() - n * 24 * 3600_000);
    await insertOrder(ctx, {
      userId: customerId,
      productId: low.id,
      unitPriceCents: 1000,
      status: 'PAID',
      paidAt: days(1),
    });
    await insertOrder(ctx, {
      userId: customerId,
      productId: low.id,
      unitPriceCents: 2000,
      status: 'DELIVERED',
      paidAt: days(10),
    });
    await insertOrder(ctx, {
      userId: customerId,
      productId: low.id,
      unitPriceCents: 4000,
      status: 'DELIVERED',
      paidAt: days(40),
    });
    await insertOrder(ctx, {
      userId: customerId,
      productId: low.id,
      unitPriceCents: 8000,
      status: 'CANCELLED',
      paidAt: days(2),
    });
    await insertOrder(ctx, {
      userId: customerId,
      productId: low.id,
      unitPriceCents: 500,
      status: 'PENDING_PAYMENT',
    });

    const res = await admin.get('/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.ordersByStatus).toEqual({
      PENDING_PAYMENT: 1,
      PAID: 1,
      PREPARING: 0,
      READY_FOR_PICKUP: 0,
      SHIPPED: 0,
      DELIVERED: 2,
      CANCELLED: 1,
      EXPIRED: 0,
    });
    expect(res.body.last30Days).toMatchObject({ paidOrders: 2, salesCents: 3000 });
    expect(res.body.lowStockProducts.map((p: { name: string }) => p.name)).toEqual(['Poco']);
  });
});
