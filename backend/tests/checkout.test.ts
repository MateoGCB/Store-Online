import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createCategory,
  createProduct,
  createTestContext,
  loggedIn,
  productState,
  resetDb,
  setStoreSettings,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => ctx.close());
beforeEach(async () => {
  await resetDb(ctx);
  await setStoreSettings(ctx, 1500_00);
  ctx.payments.preferences.length = 0;
  ctx.payments.failNextPreference = false;
});

const address = {
  fullName: 'Ana Pérez',
  phone: '1155551234',
  street: 'Corrientes',
  number: '1234',
  city: 'CABA',
  province: 'Buenos Aires',
  postalCode: 'C1043',
};

describe('checkout', () => {
  it('creates a PENDING_PAYMENT order, reserves stock, empties the cart and returns the payment URL', async () => {
    const { client: c } = await loggedIn(ctx);
    const a = await createProduct(ctx, { name: 'Taza', priceCents: 1000_00, stock: 10 });
    const b = await createProduct(ctx, { name: 'Plato', priceCents: 2500_50, stock: 3 });
    await c.put(`/cart/items/${a.id}`, { quantity: 2 });
    await c.put(`/cart/items/${b.id}`, { quantity: 1 });

    const res = await c.post('/checkout', { fulfillment: 'PICKUP', notes: 'Paso a la tarde' });
    expect(res.status).toBe(201);
    const order = res.body.order;
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.subtotalCents).toBe(450050);
    expect(order.shippingCents).toBe(0);
    expect(order.totalCents).toBe(450050);
    expect(order.notes).toBe('Paso a la tarde');
    expect(order.shippingAddress).toBeNull();
    expect(order.number).toBe(1);
    // 30 minutes after the injected clock (2026-11-04T12:00:00Z)
    expect(order.expiresAt).toBe('2026-11-04T12:30:00.000Z');
    expect(res.body.paymentUrl).toMatch(/^https:\/\/payments\.example\.test\/checkout\/pref-/);

    expect(await productState(ctx, a.id)).toEqual({ stock: 10, reserved: 2 });
    expect(await productState(ctx, b.id)).toEqual({ stock: 3, reserved: 1 });
    expect((await c.get('/cart')).body.items).toEqual([]);

    const pref = ctx.payments.preferences[0]!;
    expect(pref.orderId).toBe(order.id);
    expect(pref.notificationUrl).toBe('http://localhost:4000/api/v1/webhooks/mercadopago');
    expect(pref.backUrls.success).toBe(
      `http://localhost:3000/checkout/result?orderId=${order.id}&payment=success`,
    );
    expect(pref.backUrls.failure).toBe(
      `http://localhost:3000/checkout/result?orderId=${order.id}&payment=failure`,
    );
    expect(pref.backUrls.pending).toBe(
      `http://localhost:3000/checkout/result?orderId=${order.id}&payment=pending`,
    );
    expect(pref.items.map((i) => [i.title, i.quantity, i.unitPriceCents]).sort()).toEqual([
      ['Plato', 1, 250050],
      ['Taza', 2, 100000],
    ]);
  });

  it('computes totals on the server and ignores prices sent by the client', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { priceCents: 999_99, stock: 5 });
    await c.put(`/cart/items/${p.id}`, { quantity: 2 });
    const addressId = (await c.post('/addresses', address)).body.id;
    const res = await c.post('/checkout', {
      fulfillment: 'DELIVERY',
      addressId,
      totalCents: 1,
      subtotalCents: 1,
      shippingCents: 0,
      items: [{ productId: p.id, quantity: 2, priceCents: 1 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.order.subtotalCents).toBe(199998);
    expect(res.body.order.shippingCents).toBe(150000);
    expect(res.body.order.totalCents).toBe(349998);
    expect(res.body.order.items[0].unitPriceCents).toBe(99999);
    expect(res.body.order.shippingAddress).toMatchObject({
      fullName: 'Ana Pérez',
      street: 'Corrientes',
      postalCode: 'C1043',
    });
    const shippingItem = ctx.payments.preferences[0]!.items.find((i) => i.id === 'shipping');
    expect(shippingItem?.unitPriceCents).toBe(150000);
  });

  it('copies the address: later edits do not change the order', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx);
    await c.put(`/cart/items/${p.id}`, { quantity: 1 });
    const addressId = (await c.post('/addresses', address)).body.id;
    const res = await c.post('/checkout', { fulfillment: 'DELIVERY', addressId });
    await c.patch(`/addresses/${addressId}`, { street: 'Otra calle' });
    await c.delete(`/addresses/${addressId}`);
    const order = await c.get(`/orders/${res.body.order.id}`);
    expect(order.body.shippingAddress.street).toBe('Corrientes');
  });

  it('DELIVERY requires an own address; notes are limited to 300 characters', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx);
    await c.put(`/cart/items/${p.id}`, { quantity: 1 });
    const noAddress = await c.post('/checkout', { fulfillment: 'DELIVERY' });
    expect(noAddress.status).toBe(400);
    expect(noAddress.body.error.code).toBe('ADDRESS_REQUIRED');
    const longNotes = await c.post('/checkout', { fulfillment: 'PICKUP', notes: 'x'.repeat(301) });
    expect(longNotes.status).toBe(400);
    const bad = await c.post('/checkout', { fulfillment: 'TELEPORT' });
    expect(bad.status).toBe(400);
    expect(await productState(ctx, p.id)).toEqual({ stock: 10, reserved: 0 });
  });

  it('an empty cart answers 409 CART_EMPTY', async () => {
    const { client: c } = await loggedIn(ctx);
    const res = await c.post('/checkout', { fulfillment: 'PICKUP' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_EMPTY');
  });

  it('an archived product in the cart blocks the checkout', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx);
    await c.put(`/cart/items/${p.id}`, { quantity: 1 });
    await ctx.prisma.product.update({ where: { id: p.id }, data: { archivedAt: new Date() } });
    const res = await c.post('/checkout', { fulfillment: 'PICKUP' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PRODUCT_UNAVAILABLE');
    expect(await productState(ctx, p.id)).toEqual({ stock: 10, reserved: 0 });
  });

  it('rejects an order total above $10.000.000', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { priceCents: 6_000_000_00, stock: 5 });
    await c.put(`/cart/items/${p.id}`, { quantity: 2 });
    const res = await c.post('/checkout', { fulfillment: 'PICKUP' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_TOTAL_TOO_HIGH');
    expect(await productState(ctx, p.id)).toEqual({ stock: 5, reserved: 0 });
  });

  it('is all-or-nothing: if the second product is short, the first one is not reserved', async () => {
    const { client: c } = await loggedIn(ctx);
    const cat = await createCategory(ctx);
    const plenty = await createProduct(ctx, { name: 'Mucho', stock: 10, categoryId: cat.id });
    const scarce = await createProduct(ctx, { name: 'Poco', stock: 2, categoryId: cat.id });
    await c.put(`/cart/items/${plenty.id}`, { quantity: 3 });
    await c.put(`/cart/items/${scarce.id}`, { quantity: 2 });
    // Someone else takes the scarce units after they were added to this cart.
    await ctx.prisma.product.update({ where: { id: scarce.id }, data: { reserved: 1 } });

    const res = await c.post('/checkout', { fulfillment: 'PICKUP' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.details.products).toEqual([
      { productId: scarce.id, name: 'Poco', requested: 2, available: 1 },
    ]);
    expect(await productState(ctx, plenty.id)).toEqual({ stock: 10, reserved: 0 });
    expect(await productState(ctx, scarce.id)).toEqual({ stock: 2, reserved: 1 });
    expect(await ctx.prisma.order.count()).toBe(0);
    expect((await c.get('/cart')).body.items).toHaveLength(2);
  });

  it('20 simultaneous checkouts of 1 unit over stock 5: exactly 5 succeed and 15 get 409', async () => {
    const p = await createProduct(ctx, { stock: 5 });
    const buyers = [];
    for (let i = 0; i < 20; i++) {
      const { client: c } = await loggedIn(ctx);
      expect((await c.put(`/cart/items/${p.id}`, { quantity: 1 })).status).toBe(200);
      buyers.push(c);
    }
    const results = await Promise.all(
      buyers.map((c) => c.post('/checkout', { fulfillment: 'PICKUP' })),
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(statuses.filter((s) => s === 409)).toHaveLength(15);
    for (const r of results.filter((x) => x.status === 409)) {
      expect(r.body.error.code).toBe('INSUFFICIENT_STOCK');
    }
    const state = await productState(ctx, p.id);
    expect(state).toEqual({ stock: 5, reserved: 5 });
    expect(state.reserved).toBeGreaterThanOrEqual(0);
    expect(state.reserved).toBeLessThanOrEqual(state.stock);
    expect(await ctx.prisma.order.count()).toBe(5);
  });

  it('the same Idempotency-Key twice returns the same order without reserving twice', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 10 });
    await c.put(`/cart/items/${p.id}`, { quantity: 2 });
    const key = 'checkout-key-0001';
    const first = await c.post('/checkout', { fulfillment: 'PICKUP' }).set('Idempotency-Key', key);
    expect(first.status).toBe(201);
    // The cart is empty now, but the replay must still answer the original order.
    const second = await c.post('/checkout', { fulfillment: 'PICKUP' }).set('Idempotency-Key', key);
    expect(second.status).toBe(200);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(second.body.order.id).toBe(first.body.order.id);
    expect(second.body.paymentUrl).toBe(first.body.paymentUrl);
    expect(await ctx.prisma.order.count()).toBe(1);
    expect(await productState(ctx, p.id)).toEqual({ stock: 10, reserved: 2 });
  });

  it('the same Idempotency-Key sent concurrently creates a single order', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 10 });
    await c.put(`/cart/items/${p.id}`, { quantity: 1 });
    const key = 'checkout-key-concurrent';
    const [r1, r2] = await Promise.all([
      c.post('/checkout', { fulfillment: 'PICKUP' }).set('Idempotency-Key', key),
      c.post('/checkout', { fulfillment: 'PICKUP' }).set('Idempotency-Key', key),
    ]);
    const ok = [r1, r2].filter((r) => r.status === 200 || r.status === 201);
    expect(await ctx.prisma.order.count()).toBe(1);
    expect(await productState(ctx, p.id)).toEqual({ stock: 10, reserved: 1 });
    for (const r of ok) expect(r.body.order.id).toBe(ok[0]!.body.order.id);
  });

  it('keys are per user: another customer with the same key gets a different order', async () => {
    const p = await createProduct(ctx, { stock: 10 });
    const one = (await loggedIn(ctx)).client;
    const two = (await loggedIn(ctx)).client;
    await one.put(`/cart/items/${p.id}`, { quantity: 1 });
    await two.put(`/cart/items/${p.id}`, { quantity: 1 });
    const key = 'shared-key-123';
    const a = await one.post('/checkout', { fulfillment: 'PICKUP' }).set('Idempotency-Key', key);
    const b = await two.post('/checkout', { fulfillment: 'PICKUP' }).set('Idempotency-Key', key);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.order.id).not.toBe(b.body.order.id);
  });

  it('if the payment preference fails: 502, order cancelled, reservation released, cart restored', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 4 });
    await c.put(`/cart/items/${p.id}`, { quantity: 3 });
    ctx.payments.failNextPreference = true;
    const res = await c.post('/checkout', { fulfillment: 'PICKUP' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('PAYMENT_PROVIDER_ERROR');
    expect(await productState(ctx, p.id)).toEqual({ stock: 4, reserved: 0 });
    const order = await ctx.prisma.order.findFirstOrThrow({ include: { payments: true } });
    expect(order.status).toBe('CANCELLED');
    expect(order.cancelReason).toBe('PAYMENT_PROVIDER_ERROR');
    expect(order.payments[0]!.status).toBe('CANCELLED');
    const cart = await c.get('/cart');
    expect(cart.body.items.map((i: { quantity: number }) => i.quantity)).toEqual([3]);
  });

  it('answers 503 when payments are not configured', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx);
    await c.put(`/cart/items/${p.id}`, { quantity: 1 });
    const saved = ctx.deps.payments;
    ctx.deps.payments = null;
    try {
      const res = await c.post('/checkout', { fulfillment: 'PICKUP' });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('PAYMENTS_NOT_CONFIGURED');
    } finally {
      ctx.deps.payments = saved;
    }
    expect(await productState(ctx, p.id)).toEqual({ stock: 10, reserved: 0 });
  });
});

describe('orders (customer)', () => {
  it('lists own orders newest first, paginated', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 20 });
    for (let i = 0; i < 3; i++) {
      await c.put(`/cart/items/${p.id}`, { quantity: 1 });
      expect((await c.post('/checkout', { fulfillment: 'PICKUP' })).status).toBe(201);
      ctx.clock.advanceMinutes(1);
    }
    const res = await c.get('/orders?pageSize=2');
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((o: { number: number }) => o.number)).toEqual([3, 2]);
    const page2 = await c.get('/orders?pageSize=2&page=2');
    expect(page2.body.items.map((o: { number: number }) => o.number)).toEqual([1]);
    ctx.clock.advanceMinutes(-3);
  });

  it('cancel releases the reservation; only PENDING_PAYMENT can be cancelled', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 5 });
    await c.put(`/cart/items/${p.id}`, { quantity: 2 });
    const orderId = (await c.post('/checkout', { fulfillment: 'PICKUP' })).body.order.id;
    const res = await c.post(`/orders/${orderId}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(await productState(ctx, p.id)).toEqual({ stock: 5, reserved: 0 });
    const again = await c.post(`/orders/${orderId}/cancel`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
    expect(await productState(ctx, p.id)).toEqual({ stock: 5, reserved: 0 });
  });

  it('pay returns the same preference URL while pending and 409 once it is not', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 5 });
    await c.put(`/cart/items/${p.id}`, { quantity: 1 });
    const checkout = await c.post('/checkout', { fulfillment: 'PICKUP' });
    const orderId = checkout.body.order.id;
    const pay = await c.post(`/orders/${orderId}/pay`);
    expect(pay.status).toBe(200);
    expect(pay.body.paymentUrl).toBe(checkout.body.paymentUrl);
    expect(ctx.payments.preferences).toHaveLength(1);
    await c.post(`/orders/${orderId}/cancel`);
    const after = await c.post(`/orders/${orderId}/pay`);
    expect(after.status).toBe(409);
    expect(after.body.error.code).toBe('ORDER_NOT_PAYABLE');
  });
});
