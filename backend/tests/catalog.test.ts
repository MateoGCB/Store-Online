import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  API,
  createCategory,
  createProduct,
  createTestContext,
  resetDb,
  setStoreSettings,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => ctx.close());
beforeEach(async () => resetDb(ctx));

const get = (url: string) => request(ctx.app).get(API + url);
const names = (res: request.Response) => res.body.items.map((p: { name: string }) => p.name);

describe('GET /products', () => {
  it('returns a paginated envelope with only allow-listed fields', async () => {
    const cat = await createCategory(ctx, 'Cocina');
    const p = await createProduct(ctx, {
      name: 'Taza',
      priceCents: 4500_00,
      stock: 7,
      reserved: 2,
      categoryId: cat.id,
    });
    await ctx.prisma.productImage.create({
      data: { productId: p.id, storageKey: 'products/abc.webp', position: 0, alt: 'Taza' },
    });
    const res = await get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: expect.any(Array), page: 1, pageSize: 12, total: 1 });
    const item = res.body.items[0];
    expect(Object.keys(item).sort()).toEqual(
      [
        'category',
        'description',
        'id',
        'images',
        'inStock',
        'maxPurchasable',
        'name',
        'priceCents',
        'slug',
      ].sort(),
    );
    expect(item.priceCents).toBe(450000);
    expect(item.inStock).toBe(true);
    expect(item.maxPurchasable).toBe(5);
    expect(item.images[0]).toEqual({
      id: expect.any(String),
      url: 'http://localhost:4000/uploads/products/abc.webp',
      alt: 'Taza',
      position: 0,
    });
    expect(item.category).toEqual({ id: cat.id, name: 'Cocina', slug: cat.slug });
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/"stock"|"reserved"|searchText|archivedAt|"active"/);
  });

  it('caps maxPurchasable at 20 and reports out of stock', async () => {
    await createProduct(ctx, { name: 'Mucho', stock: 500 });
    await createProduct(ctx, { name: 'Nada', stock: 3, reserved: 3 });
    const res = await get('/products?sort=name');
    expect(res.body.items).toMatchObject([
      { name: 'Mucho', inStock: true, maxPurchasable: 20 },
      { name: 'Nada', inStock: false, maxPurchasable: 0 },
    ]);
  });

  it('hides inactive and archived products (list and detail)', async () => {
    await createProduct(ctx, { name: 'Visible' });
    const inactive = await createProduct(ctx, { name: 'Inactivo', active: false });
    const archived = await createProduct(ctx, { name: 'Archivado', archived: true });
    const res = await get('/products');
    expect(names(res)).toEqual(['Visible']);
    expect((await get(`/products/${inactive.slug}`)).status).toBe(404);
    const detail = await get(`/products/${archived.slug}`);
    expect(detail.status).toBe(404);
    expect(detail.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('searches name and description ignoring case and accents', async () => {
    await createProduct(ctx, { name: 'Maceta de cerámica', description: 'Para plantas' });
    await createProduct(ctx, { name: 'Taza', description: 'Hecha en CERAMICA esmaltada' });
    await createProduct(ctx, { name: 'Cuaderno', description: 'Tapa dura' });
    expect(names(await get('/products?q=ceramica&sort=name')).sort()).toEqual([
      'Maceta de cerámica',
      'Taza',
    ]);
    expect(names(await get('/products?q=CERÁMICA%20maceta'))).toEqual(['Maceta de cerámica']);
    expect(names(await get('/products?q=tapa'))).toEqual(['Cuaderno']);
    expect(names(await get('/products?q=inexistente'))).toEqual([]);
  });

  it('filters by category slug, price range and stock', async () => {
    const cocina = await createCategory(ctx, 'Cocina');
    const jardin = await createCategory(ctx, 'Jardín');
    await createProduct(ctx, { name: 'A', priceCents: 1000, categoryId: cocina.id });
    await createProduct(ctx, { name: 'B', priceCents: 5000, categoryId: cocina.id, stock: 0 });
    await createProduct(ctx, { name: 'C', priceCents: 9000, categoryId: jardin.id });
    expect(names(await get(`/products?category=${cocina.slug}&sort=name`))).toEqual(['A', 'B']);
    expect(names(await get('/products?minPrice=2000&maxPrice=9000&sort=name'))).toEqual(['B', 'C']);
    expect(names(await get('/products?inStock=true&sort=name'))).toEqual(['A', 'C']);
    expect(names(await get('/products?category=no-existe'))).toEqual([]);
  });

  it('sorts by newest, price and name', async () => {
    const t = (h: number) => new Date(Date.UTC(2026, 0, 1, h));
    await createProduct(ctx, { name: 'Banana', priceCents: 300, createdAt: t(1) });
    await createProduct(ctx, { name: 'Anana', priceCents: 200, createdAt: t(3) });
    await createProduct(ctx, { name: 'Cereza', priceCents: 100, createdAt: t(2) });
    expect(names(await get('/products'))).toEqual(['Anana', 'Cereza', 'Banana']);
    expect(names(await get('/products?sort=price_asc'))).toEqual(['Cereza', 'Anana', 'Banana']);
    expect(names(await get('/products?sort=price_desc'))).toEqual(['Banana', 'Anana', 'Cereza']);
    expect(names(await get('/products?sort=name'))).toEqual(['Anana', 'Banana', 'Cereza']);
  });

  it('paginates with defaults 12 and maximum 50', async () => {
    const cat = await createCategory(ctx);
    for (let i = 0; i < 15; i++) {
      await createProduct(ctx, { name: `P${String(i).padStart(2, '0')}`, categoryId: cat.id });
    }
    const first = await get('/products?sort=name');
    expect(first.body.items).toHaveLength(12);
    expect(first.body.total).toBe(15);
    const second = await get('/products?sort=name&page=2');
    expect(names(second)).toEqual(['P12', 'P13', 'P14']);
    expect(second.body.page).toBe(2);
    const custom = await get('/products?pageSize=5&page=3&sort=name');
    expect(names(custom)).toEqual(['P10', 'P11', 'P12', 'P13', 'P14']);
    expect((await get('/products?pageSize=50')).status).toBe(200);
    expect((await get('/products?pageSize=51')).status).toBe(400);
    expect((await get('/products?pageSize=0')).status).toBe(400);
    expect((await get('/products?page=0')).status).toBe(400);
  });
});

describe('other public endpoints', () => {
  it('GET /products/:slug returns the product', async () => {
    const p = await createProduct(ctx, { name: 'Detalle', priceCents: 12345 });
    const res = await get(`/products/${p.slug}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: p.id, name: 'Detalle', priceCents: 12345 });
    expect(res.body.stock).toBeUndefined();
    expect(res.body.reserved).toBeUndefined();
  });

  it('GET /categories lists categories by name', async () => {
    await createCategory(ctx, 'Papelería');
    await createCategory(ctx, 'Cocina');
    const res = await get('/categories');
    expect(res.body.items.map((c: { name: string }) => c.name)).toEqual(['Cocina', 'Papelería']);
  });

  it('GET /store-info returns name, pickup and shipping cost', async () => {
    await setStoreSettings(ctx, 3500_00);
    const res = await get('/store-info');
    expect(res.body).toEqual({
      storeName: 'Tienda Test',
      shippingCostCents: 350000,
      pickupAddress: 'Calle 1',
    });
  });
});
