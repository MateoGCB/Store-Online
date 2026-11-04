import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { centsToAmount, amountToCents } from '../src/lib/money.js';
import {
  API,
  createProduct,
  createTestContext,
  loggedIn,
  productState,
  resetDb,
  sendWebhook,
  setStoreSettings,
  signWebhook,
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
  ctx.payments.failGetPayment = false;
});

async function pendingOrder(quantity = 2, stock = 5, priceCents = 1234_56) {
  const { client: c } = await loggedIn(ctx);
  const p = await createProduct(ctx, { stock, priceCents });
  await c.put(`/cart/items/${p.id}`, { quantity });
  const res = await c.post('/checkout', { fulfillment: 'PICKUP' });
  expect(res.status).toBe(201);
  return { c, productId: p.id, order: res.body.order as { id: string; totalCents: number } };
}

function approve(
  orderId: string,
  amount: number,
  id = randomUUID().slice(0, 12),
  currency = 'ARS',
) {
  return ctx.payments.addPayment({
    id,
    status: 'approved',
    externalReference: orderId,
    amount,
    currency,
  });
}

async function orderRow(id: string) {
  return ctx.prisma.order.findUniqueOrThrow({ where: { id }, include: { payments: true } });
}

describe('money conversion', () => {
  it('converts cents to pesos exactly and back', () => {
    expect(centsToAmount(246912)).toBe(2469.12);
    expect(centsToAmount(1)).toBe(0.01);
    expect(centsToAmount(10)).toBe(0.1);
    expect(centsToAmount(1000000000)).toBe(10000000);
    expect(amountToCents(2469.12)).toBe(246912);
    expect(amountToCents(0.1 + 0.2)).toBe(30);
    expect(amountToCents(10.005)).toBeNull();
    expect(amountToCents(Number.NaN)).toBeNull();
  });
});

describe('Mercado Pago webhook', () => {
  it('approved payment with a valid signature marks the order PAID and moves the stock', async () => {
    const { order, productId } = await pendingOrder(2, 5, 1234_56);
    expect(order.totalCents).toBe(246912);
    approve(order.id, 2469.12, 'pay-1');
    const res = await sendWebhook(ctx, 'pay-1');
    expect(res.status).toBe(200);
    const stored = await orderRow(order.id);
    expect(stored.status).toBe('PAID');
    expect(stored.paidAt?.toISOString()).toBe('2026-11-04T12:00:00.000Z');
    expect(stored.needsAttention).toBe(false);
    expect(stored.payments.map((p) => [p.providerPaymentId, p.status])).toEqual([
      ['pay-1', 'APPROVED'],
    ]);
    expect(await productState(ctx, productId)).toEqual({ stock: 3, reserved: 0 });
    const movements = await ctx.prisma.stockMovement.findMany({ where: { orderId: order.id } });
    expect(movements.map((m) => [m.reason, m.delta])).toEqual([['SALE', -2]]);
  });

  it('rejects an invalid signature with 401 and changes nothing', async () => {
    const { order, productId } = await pendingOrder();
    approve(order.id, order.totalCents / 100, 'pay-2');
    const wrongSecret = await sendWebhook(ctx, 'pay-2', { secret: 'another-secret' });
    expect(wrongSecret.status).toBe(401);
    expect(wrongSecret.body.error.code).toBe('INVALID_SIGNATURE');
    const garbage = await sendWebhook(ctx, 'pay-2', { signature: 'ts=1,v1=deadbeef' });
    expect(garbage.status).toBe(401);

    // Signature computed for another payment id cannot be reused for this one.
    const forOther = signWebhook('other-id', 'req-x');
    const reused = await request(ctx.app)
      .post(`${API}/webhooks/mercadopago?data.id=pay-2&type=payment`)
      .set('x-request-id', 'req-x')
      .set('x-signature', forOther)
      .send({ type: 'payment', data: { id: 'pay-2' } });
    expect(reused.status).toBe(401);

    const missing = await request(ctx.app)
      .post(`${API}/webhooks/mercadopago?data.id=pay-2&type=payment`)
      .send({ type: 'payment', data: { id: 'pay-2' } });
    expect(missing.status).toBe(401);

    expect((await orderRow(order.id)).status).toBe('PENDING_PAYMENT');
    expect(await productState(ctx, productId)).toEqual({ stock: 5, reserved: 2 });
    expect(await ctx.prisma.webhookEvent.count()).toBe(0);
  });

  it('the same event twice is processed once', async () => {
    const { order, productId } = await pendingOrder(1, 5);
    approve(order.id, order.totalCents / 100, 'pay-3');
    expect((await sendWebhook(ctx, 'pay-3', { notificationId: 777 })).status).toBe(200);
    expect((await sendWebhook(ctx, 'pay-3', { notificationId: 777 })).status).toBe(200);
    // A different notification about the same approved payment does not apply it again.
    expect((await sendWebhook(ctx, 'pay-3', { notificationId: 778 })).status).toBe(200);
    expect(await productState(ctx, productId)).toEqual({ stock: 4, reserved: 0 });
    expect(await ctx.prisma.stockMovement.count({ where: { orderId: order.id } })).toBe(1);
    expect(await ctx.prisma.webhookEvent.count()).toBe(2);
  });

  it('the same event delivered concurrently is processed once', async () => {
    const { order, productId } = await pendingOrder(1, 5);
    approve(order.id, order.totalCents / 100, 'pay-3b');
    const results = await Promise.all([
      sendWebhook(ctx, 'pay-3b', { notificationId: 900 }),
      sendWebhook(ctx, 'pay-3b', { notificationId: 900 }),
      sendWebhook(ctx, 'pay-3b', { notificationId: 900 }),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(await productState(ctx, productId)).toEqual({ stock: 4, reserved: 0 });
    expect(await ctx.prisma.stockMovement.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('a different amount does not mark the order paid and flags it', async () => {
    const { order, productId } = await pendingOrder(2, 5, 1000_00);
    approve(order.id, 1999.99, 'pay-4');
    expect((await sendWebhook(ctx, 'pay-4')).status).toBe(200);
    const stored = await orderRow(order.id);
    expect(stored.status).toBe('PENDING_PAYMENT');
    expect(stored.needsAttention).toBe(true);
    expect(stored.paidAt).toBeNull();
    expect(await productState(ctx, productId)).toEqual({ stock: 5, reserved: 2 });
  });

  it('a different currency does not mark the order paid', async () => {
    const { order } = await pendingOrder(1, 5, 1000_00);
    approve(order.id, 1000, 'pay-5', 'USD');
    await sendWebhook(ctx, 'pay-5');
    const stored = await orderRow(order.id);
    expect(stored.status).toBe('PENDING_PAYMENT');
    expect(stored.needsAttention).toBe(true);
  });

  it('a payment for a nonexistent order is acknowledged and changes nothing', async () => {
    const { order, productId } = await pendingOrder();
    approve(randomUUID(), 10, 'pay-6');
    approve('not-a-uuid', 10, 'pay-6b');
    expect((await sendWebhook(ctx, 'pay-6')).status).toBe(200);
    expect((await sendWebhook(ctx, 'pay-6b')).status).toBe(200);
    expect((await orderRow(order.id)).status).toBe('PENDING_PAYMENT');
    expect(await productState(ctx, productId)).toEqual({ stock: 5, reserved: 2 });
  });

  it('a payment the provider does not know is acknowledged without changes', async () => {
    const { order } = await pendingOrder();
    expect((await sendWebhook(ctx, 'unknown-payment')).status).toBe(200);
    expect((await orderRow(order.id)).status).toBe('PENDING_PAYMENT');
  });

  it('answers 500 when the provider API fails, so Mercado Pago retries', async () => {
    const { order } = await pendingOrder();
    approve(order.id, order.totalCents / 100, 'pay-7');
    ctx.payments.failGetPayment = true;
    const first = await sendWebhook(ctx, 'pay-7', { notificationId: 4242 });
    expect(first.status).toBe(500);
    expect(first.body.error.code).toBe('INTERNAL_ERROR');
    ctx.payments.failGetPayment = false;
    const retry = await sendWebhook(ctx, 'pay-7', { notificationId: 4242 });
    expect(retry.status).toBe(200);
    expect((await orderRow(order.id)).status).toBe('PAID');
  });

  it('rejected payment keeps the order pending until it expires; a later approval pays it', async () => {
    const { order, productId } = await pendingOrder(1, 5);
    ctx.payments.addPayment({
      id: 'pay-8',
      status: 'rejected',
      externalReference: order.id,
      amount: order.totalCents / 100,
      currency: 'ARS',
    });
    await sendWebhook(ctx, 'pay-8');
    let stored = await orderRow(order.id);
    expect(stored.status).toBe('PENDING_PAYMENT');
    expect(stored.payments.map((p) => p.status)).toEqual(['REJECTED']);
    expect(await productState(ctx, productId)).toEqual({ stock: 5, reserved: 1 });

    approve(order.id, order.totalCents / 100, 'pay-9');
    await sendWebhook(ctx, 'pay-9');
    stored = await orderRow(order.id);
    expect(stored.status).toBe('PAID');
    expect(stored.payments.map((p) => p.status).sort()).toEqual(['APPROVED', 'REJECTED']);
  });

  it('late approval of an expired order re-takes the stock when available', async () => {
    const { order, productId, c } = await pendingOrder(2, 5);
    ctx.clock.advanceMinutes(31);
    expect((await c.get(`/orders/${order.id}`)).body.status).toBe('EXPIRED');
    expect(await productState(ctx, productId)).toEqual({ stock: 5, reserved: 0 });
    approve(order.id, order.totalCents / 100, 'pay-10');
    await sendWebhook(ctx, 'pay-10');
    const stored = await orderRow(order.id);
    expect(stored.status).toBe('PAID');
    expect(stored.needsAttention).toBe(false);
    expect(await productState(ctx, productId)).toEqual({ stock: 3, reserved: 0 });
    const movements = await ctx.prisma.stockMovement.findMany({ where: { orderId: order.id } });
    expect(movements.map((m) => [m.reason, m.delta])).toEqual([['LATE_PAYMENT', -2]]);
  });

  it('late approval without stock leaves the order expired, flagged, and records the payment', async () => {
    const { order, productId, c } = await pendingOrder(2, 3);
    ctx.clock.advanceMinutes(31);
    await c.get(`/orders/${order.id}`);
    // Another customer buys the units in the meantime.
    await ctx.prisma.product.update({ where: { id: productId }, data: { reserved: 2 } });
    approve(order.id, order.totalCents / 100, 'pay-11');
    await sendWebhook(ctx, 'pay-11');
    const stored = await orderRow(order.id);
    expect(stored.status).toBe('EXPIRED');
    expect(stored.needsAttention).toBe(true);
    expect(stored.payments.map((p) => [p.providerPaymentId, p.status])).toEqual([
      ['pay-11', 'APPROVED'],
    ]);
    expect(await productState(ctx, productId)).toEqual({ stock: 3, reserved: 2 });
  });

  it('a cancelled-and-refunded paid order is not revived by a repeated notification', async () => {
    const { order, productId } = await pendingOrder(1, 5);
    approve(order.id, order.totalCents / 100, 'pay-12');
    await sendWebhook(ctx, 'pay-12');
    const admin = await loggedIn(ctx, { role: 'ADMIN' });
    const cancel = await admin.client.post(`/admin/orders/${order.id}/cancel`, {
      reason: 'Sin envío',
    });
    expect(cancel.status).toBe(200);
    await sendWebhook(ctx, 'pay-12');
    const stored = await orderRow(order.id);
    expect(stored.status).toBe('CANCELLED');
    expect(await productState(ctx, productId)).toEqual({ stock: 5, reserved: 0 });
  });

  it('ignores notifications that are not about payments', async () => {
    const res = await request(ctx.app)
      .post(`${API}/webhooks/mercadopago?data.id=123&type=merchant_order`)
      .set('x-request-id', 'r1')
      .set('x-signature', signWebhook('123', 'r1'))
      .send({ type: 'merchant_order', data: { id: '123' } });
    expect(res.status).toBe(200);
    expect(await ctx.prisma.webhookEvent.count()).toBe(0);
  });
});

describe('POST /orders/:id/sync', () => {
  it('pulls the real payment state when the webhook did not arrive', async () => {
    const { order, productId, c } = await pendingOrder(1, 5);
    approve(order.id, order.totalCents / 100, 'pay-20');
    const res = await c.post(`/orders/${order.id}/sync`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');
    expect(await productState(ctx, productId)).toEqual({ stock: 4, reserved: 0 });
    // Running sync again (or the late webhook) does not apply it twice.
    await c.post(`/orders/${order.id}/sync`);
    await sendWebhook(ctx, 'pay-20');
    expect(await productState(ctx, productId)).toEqual({ stock: 4, reserved: 0 });
  });

  it('keeps the order pending when there is no approved payment', async () => {
    const { order, c } = await pendingOrder(1, 5);
    const res = await c.post(`/orders/${order.id}/sync`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING_PAYMENT');
  });
});

describe('webhook authentication: exempt from Origin/Referer, protected only by the signature', () => {
  it('a valid signature WITHOUT Origin or Referer is processed (the order gets paid)', async () => {
    const { order, productId } = await pendingOrder(1, 5);
    approve(order.id, order.totalCents / 100, 'pay-30');
    const res = await request(ctx.app)
      .post(`${API}/webhooks/mercadopago?data.id=pay-30&type=payment`)
      .set('Content-Type', 'application/json')
      .set('x-request-id', 'req-pay-30')
      .set('x-signature', signWebhook('pay-30', 'req-pay-30'))
      .send({ id: 30, type: 'payment', action: 'payment.updated', data: { id: 'pay-30' } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect((await orderRow(order.id)).status).toBe('PAID');
    expect(await productState(ctx, productId)).toEqual({ stock: 4, reserved: 0 });
  });

  it('a valid signature from a foreign Origin is also processed (Origin is not what authenticates it)', async () => {
    const { order } = await pendingOrder(1, 5);
    approve(order.id, order.totalCents / 100, 'pay-31');
    const res = await request(ctx.app)
      .post(`${API}/webhooks/mercadopago?data.id=pay-31&type=payment`)
      .set('Origin', 'https://evil.example')
      .set('x-request-id', 'req-pay-31')
      .set('x-signature', signWebhook('pay-31', 'req-pay-31'))
      .send({ id: 31, type: 'payment', data: { id: 'pay-31' } });
    expect(res.status).toBe(200);
    expect((await orderRow(order.id)).status).toBe('PAID');
  });

  it('without a valid signature it is rejected with 401 (not 403), whatever the Origin', async () => {
    const { order } = await pendingOrder(1, 5);
    approve(order.id, order.totalCents / 100, 'pay-32');
    for (const origin of [undefined, 'http://localhost:3000', 'https://evil.example']) {
      const req = request(ctx.app)
        .post(`${API}/webhooks/mercadopago?data.id=pay-32&type=payment`)
        .set('x-request-id', 'req-pay-32');
      if (origin) req.set('Origin', origin);
      const res = await req.send({ type: 'payment', data: { id: 'pay-32' } });
      expect(res.status, String(origin)).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    }
    expect((await orderRow(order.id)).status).toBe('PENDING_PAYMENT');
  });

  it('every other state-changing route still requires an allowed Origin', async () => {
    const res = await request(ctx.app)
      .post(`${API}/orders/00000000-0000-4000-8000-000000000000/sync`)
      .set('Content-Type', 'application/json')
      .set('x-signature', signWebhook('x', 'y'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });
});
