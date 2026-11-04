import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { expireOverdueOrders } from '../src/services/stock.service.js';
import {
  createProduct,
  createTestContext,
  loggedIn,
  productState,
  resetDb,
  sendWebhook,
  setStoreSettings,
  type Client,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
const START = new Date('2026-11-04T12:00:00.000Z');
beforeAll(async () => {
  ctx = await createTestContext({ start: START });
});
afterAll(async () => ctx.close());
beforeEach(async () => {
  await resetDb(ctx);
  await setStoreSettings(ctx);
  ctx.clock.set(START);
});

async function checkoutOne(c: Client, productId: string, quantity: number) {
  await c.put(`/cart/items/${productId}`, { quantity });
  const res = await c.post('/checkout', { fulfillment: 'PICKUP' });
  expect(res.status).toBe(201);
  return res.body.order as { id: string; totalCents: number };
}

describe('reservation expiry', () => {
  it('does not expire before RESERVATION_MINUTES and expires after, releasing stock', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 5 });
    const order = await checkoutOne(c, p.id, 3);

    ctx.clock.advanceMinutes(29);
    expect(await expireOverdueOrders(ctx.deps)).toBe(0);
    expect(await productState(ctx, p.id)).toEqual({ stock: 5, reserved: 3 });

    ctx.clock.advanceMinutes(2);
    expect(await expireOverdueOrders(ctx.deps)).toBe(1);
    expect(await productState(ctx, p.id)).toEqual({ stock: 5, reserved: 0 });
    const stored = await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe('EXPIRED');
  });

  it('never releases twice even when it runs concurrently', async () => {
    const p = await createProduct(ctx, { stock: 10 });
    for (let i = 0; i < 4; i++) {
      const { client: c } = await loggedIn(ctx);
      await checkoutOne(c, p.id, 2);
    }
    expect(await productState(ctx, p.id)).toEqual({ stock: 10, reserved: 8 });
    ctx.clock.advanceMinutes(31);
    const counts = await Promise.all([
      expireOverdueOrders(ctx.deps),
      expireOverdueOrders(ctx.deps),
      expireOverdueOrders(ctx.deps),
    ]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(4);
    expect(await productState(ctx, p.id)).toEqual({ stock: 10, reserved: 0 });
    expect(await expireOverdueOrders(ctx.deps)).toBe(0);
    expect(await productState(ctx, p.id)).toEqual({ stock: 10, reserved: 0 });
  });

  it('expires lazily when the order is read, and an expired order cannot be paid', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 2 });
    const order = await checkoutOne(c, p.id, 2);
    ctx.clock.advanceMinutes(45);
    const read = await c.get(`/orders/${order.id}`);
    expect(read.body.status).toBe('EXPIRED');
    expect(await productState(ctx, p.id)).toEqual({ stock: 2, reserved: 0 });
    const pay = await c.post(`/orders/${order.id}/pay`);
    expect(pay.status).toBe(409);
    expect(pay.body.error.code).toBe('ORDER_NOT_PAYABLE');
    const cancel = await c.post(`/orders/${order.id}/cancel`);
    expect(cancel.status).toBe(409);
    expect(await productState(ctx, p.id)).toEqual({ stock: 2, reserved: 0 });
  });

  it('race between expiry and payment approval never leaks a reservation', async () => {
    for (let round = 0; round < 6; round++) {
      await resetDb(ctx);
      await setStoreSettings(ctx);
      ctx.clock.set(START);
      const { client: c } = await loggedIn(ctx);
      const p = await createProduct(ctx, { stock: 4 });
      const order = await checkoutOne(c, p.id, 3);
      const paymentId = `race-${round}`;
      ctx.payments.addPayment({
        id: paymentId,
        status: 'approved',
        externalReference: order.id,
        amount: order.totalCents / 100,
        currency: 'ARS',
      });
      ctx.clock.advanceMinutes(31);
      const [, webhook] = await Promise.all([
        expireOverdueOrders(ctx.deps),
        sendWebhook(ctx, paymentId),
      ]);
      expect(webhook.status).toBe(200);

      const stored = await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      // Either order wins the row lock; both paths must end paid with consistent stock.
      expect(stored.status).toBe('PAID');
      expect(await productState(ctx, p.id)).toEqual({ stock: 1, reserved: 0 });
      const movements = await ctx.prisma.stockMovement.findMany({ where: { orderId: order.id } });
      expect(movements.map((m) => m.delta)).toEqual([-3]);
    }
  });
});
