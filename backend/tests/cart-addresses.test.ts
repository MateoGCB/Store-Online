import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createCategory,
  createProduct,
  createTestContext,
  loggedIn,
  resetDb,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => ctx.close());
beforeEach(async () => resetDb(ctx));

const address = {
  fullName: 'Ana Pérez',
  phone: '+54 11 5555-1234',
  street: 'Av. Siempreviva',
  number: '742',
  city: 'Springfield',
  province: 'Buenos Aires',
  postalCode: 'B1234',
};

describe('cart', () => {
  it('adds, updates and removes items using the current price', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { name: 'Taza', priceCents: 1000_00, stock: 10 });
    const put = await c.put(`/cart/items/${p.id}`, { quantity: 3 });
    expect(put.status).toBe(200);
    expect(put.body.items[0]).toMatchObject({
      productId: p.id,
      quantity: 3,
      unitPriceCents: 100000,
      lineTotalCents: 300000,
      warning: null,
    });
    expect(put.body.subtotalCents).toBe(300000);

    // Price changes are reflected immediately (the cart never stores prices).
    await ctx.prisma.product.update({ where: { id: p.id }, data: { priceCents: 1250_00 } });
    const cart = await c.get('/cart');
    expect(cart.body.subtotalCents).toBe(375000);

    const update = await c.put(`/cart/items/${p.id}`, { quantity: 1 });
    expect(update.body.items[0].quantity).toBe(1);

    const removed = await c.delete(`/cart/items/${p.id}`);
    expect(removed.body.items).toEqual([]);
    expect(removed.body.canCheckout).toBe(false);
  });

  it('accepts 1 to 20 units only', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 100 });
    expect((await c.put(`/cart/items/${p.id}`, { quantity: 20 })).status).toBe(200);
    expect((await c.put(`/cart/items/${p.id}`, { quantity: 21 })).status).toBe(400);
    expect((await c.put(`/cart/items/${p.id}`, { quantity: 0 })).status).toBe(400);
    expect((await c.put(`/cart/items/${p.id}`, { quantity: 1.5 })).status).toBe(400);
  });

  it('allows at most 30 different products', async () => {
    const { client: c } = await loggedIn(ctx);
    const cat = await createCategory(ctx);
    const products = [];
    for (let i = 0; i < 31; i++) products.push(await createProduct(ctx, { categoryId: cat.id }));
    for (const p of products.slice(0, 30)) {
      expect((await c.put(`/cart/items/${p.id}`, { quantity: 1 })).status).toBe(200);
    }
    const res = await c.put(`/cart/items/${products[30]!.id}`, { quantity: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_LIMIT_REACHED');
    // Changing the quantity of an existing line still works at the limit.
    expect((await c.put(`/cart/items/${products[0]!.id}`, { quantity: 2 })).status).toBe(200);
  });

  it('rejects more than the available units with 409 and the available quantity', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock: 5, reserved: 2 });
    const res = await c.put(`/cart/items/${p.id}`, { quantity: 4 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.details).toEqual({ productId: p.id, available: 3 });
  });

  it('archived or inactive products cannot be added and show a warning if already in the cart', async () => {
    const { client: c } = await loggedIn(ctx);
    const archived = await createProduct(ctx, { archived: true });
    const res = await c.put(`/cart/items/${archived.id}`, { quantity: 1 });
    expect(res.status).toBe(404);

    const p = await createProduct(ctx, { name: 'Se archiva', stock: 5 });
    const other = await createProduct(ctx, { name: 'Se agota', stock: 5 });
    await c.put(`/cart/items/${p.id}`, { quantity: 2 });
    await c.put(`/cart/items/${other.id}`, { quantity: 2 });
    await ctx.prisma.product.update({ where: { id: p.id }, data: { archivedAt: new Date() } });
    await ctx.prisma.product.update({ where: { id: other.id }, data: { stock: 0 } });
    const cart = await c.get('/cart');
    const byName = Object.fromEntries(
      cart.body.items.map((i: { name: string; warning: string }) => [i.name, i.warning]),
    );
    expect(byName).toEqual({ 'Se archiva': 'UNAVAILABLE', 'Se agota': 'OUT_OF_STOCK' });
    expect(cart.body.canCheckout).toBe(false);
    expect(cart.body.subtotalCents).toBe(0);
  });

  it('DELETE /cart empties it', async () => {
    const { client: c } = await loggedIn(ctx);
    const p = await createProduct(ctx);
    await c.put(`/cart/items/${p.id}`, { quantity: 1 });
    const res = await c.delete('/cart');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});

describe('addresses', () => {
  it('creates, lists, updates and deletes own addresses', async () => {
    const { client: c } = await loggedIn(ctx);
    const created = await c.post('/addresses', { ...address, floorApt: '5 B' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ ...address, floorApt: '5 B', notes: null });
    const list = await c.get('/addresses');
    expect(list.body.items).toHaveLength(1);
    const patched = await c.patch(`/addresses/${created.body.id}`, { city: 'Shelbyville' });
    expect(patched.body.city).toBe('Shelbyville');
    expect((await c.delete(`/addresses/${created.body.id}`)).status).toBe(204);
    expect((await c.get('/addresses')).body.items).toEqual([]);
  });

  it('validates fields', async () => {
    const { client: c } = await loggedIn(ctx);
    const res = await c.post('/addresses', { ...address, phone: 'abc', postalCode: '' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field).sort();
    expect(fields).toEqual(['phone', 'postalCode']);
    const extra = await c.post('/addresses', { ...address, userId: 'x' });
    expect(extra.status).toBe(400);
  });

  it('allows at most 10 per user', async () => {
    const { client: c } = await loggedIn(ctx);
    for (let i = 0; i < 10; i++) {
      expect((await c.post('/addresses', address)).status).toBe(201);
    }
    const res = await c.post('/addresses', address);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ADDRESS_LIMIT_REACHED');
  });
});
