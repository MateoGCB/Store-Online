import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createProduct,
  createTestContext,
  loggedIn,
  resetDb,
  setStoreSettings,
  type Client,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => ctx.close());
beforeEach(async () => resetDb(ctx));

const address = {
  fullName: 'Ana',
  phone: '1155551234',
  street: 'Calle',
  number: '1',
  city: 'Ciudad',
  province: 'Provincia',
  postalCode: '1000',
};

describe('two customers cannot see or touch each other data', () => {
  let alice: Client;
  let bob: Client;
  let aliceAddressId: string;
  let aliceOrderId: string;
  let productId: string;

  beforeEach(async () => {
    await setStoreSettings(ctx);
    alice = (await loggedIn(ctx, { name: 'Alice' })).client;
    bob = (await loggedIn(ctx, { name: 'Bob' })).client;
    const p = await createProduct(ctx, { stock: 10 });
    productId = p.id;
    aliceAddressId = (await alice.post('/addresses', address)).body.id;
    await alice.put(`/cart/items/${p.id}`, { quantity: 2 });
    const checkout = await alice.post('/checkout', { fulfillment: 'PICKUP' });
    expect(checkout.status).toBe(201);
    aliceOrderId = checkout.body.order.id;
    await alice.put(`/cart/items/${p.id}`, { quantity: 1 });
  });

  it("Bob gets 404 for Alice's address and cannot change or delete it", async () => {
    expect((await bob.get(`/addresses/${aliceAddressId}`)).status).toBe(404);
    const patch = await bob.patch(`/addresses/${aliceAddressId}`, { city: 'Hackeada' });
    expect(patch.status).toBe(404);
    expect((await bob.delete(`/addresses/${aliceAddressId}`)).status).toBe(404);
    expect((await bob.get('/addresses')).body.items).toEqual([]);
    const stored = await ctx.prisma.address.findUniqueOrThrow({ where: { id: aliceAddressId } });
    expect(stored.city).toBe('Ciudad');
  });

  it("Bob gets 404 for Alice's order and cannot cancel, pay or sync it", async () => {
    expect((await bob.get(`/orders/${aliceOrderId}`)).status).toBe(404);
    expect((await bob.post(`/orders/${aliceOrderId}/cancel`)).status).toBe(404);
    expect((await bob.post(`/orders/${aliceOrderId}/pay`)).status).toBe(404);
    expect((await bob.post(`/orders/${aliceOrderId}/sync`)).status).toBe(404);
    expect((await bob.get('/orders')).body.total).toBe(0);
    const order = await ctx.prisma.order.findUniqueOrThrow({ where: { id: aliceOrderId } });
    expect(order.status).toBe('PENDING_PAYMENT');
  });

  it("Bob cannot use Alice's address for his checkout", async () => {
    await bob.put(`/cart/items/${productId}`, { quantity: 1 });
    const res = await bob.post('/checkout', { fulfillment: 'DELIVERY', addressId: aliceAddressId });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ADDRESS_NOT_FOUND');
  });

  it("each cart is separate: Bob's changes do not touch Alice's cart", async () => {
    await bob.put(`/cart/items/${productId}`, { quantity: 5 });
    await bob.delete(`/cart/items/${productId}`);
    await bob.delete('/cart');
    const aliceCart = await alice.get('/cart');
    expect(aliceCart.body.items).toHaveLength(1);
    expect(aliceCart.body.items[0].quantity).toBe(1);
  });
});
