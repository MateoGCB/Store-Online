import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  API,
  ORIGIN,
  createCategory,
  createProduct,
  createTestContext,
  loggedIn,
  productState,
  resetDb,
  type Client,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
let admin: Client;
let adminId: string;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => ctx.close());
beforeEach(async () => {
  await resetDb(ctx);
  const a = await loggedIn(ctx, { role: 'ADMIN' });
  admin = a.client;
  adminId = a.user.id;
});

describe('admin categories', () => {
  it('creates with a slug without accents and adds -2 on collision', async () => {
    const first = await admin.post('/admin/categories', { name: 'Jardín & Exterior' });
    expect(first.status).toBe(201);
    expect(first.body.slug).toBe('jardin-exterior');
    const second = await admin.post('/admin/categories', { name: 'Jardin exterior' });
    expect(second.body.slug).toBe('jardin-exterior-2');
    const third = await admin.post('/admin/categories', { name: 'JARDÍN EXTERIOR' });
    expect(third.body.slug).toBe('jardin-exterior-3');
  });

  it('validates the name', async () => {
    expect((await admin.post('/admin/categories', { name: '' })).status).toBe(400);
    expect((await admin.post('/admin/categories', { name: 'x'.repeat(61) })).status).toBe(400);
    expect((await admin.post('/admin/categories', {})).status).toBe(400);
  });

  it('renames and deletes; deleting a category with products answers 409', async () => {
    const cat = (await admin.post('/admin/categories', { name: 'Cocina' })).body;
    const renamed = await admin.patch(`/admin/categories/${cat.id}`, { name: 'Cocina y mesa' });
    expect(renamed.body).toMatchObject({ name: 'Cocina y mesa', slug: 'cocina-y-mesa' });
    await createProduct(ctx, { categoryId: cat.id, archived: true });
    const blocked = await admin.delete(`/admin/categories/${cat.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('CATEGORY_HAS_PRODUCTS');
    const empty = (await admin.post('/admin/categories', { name: 'Vacía' })).body;
    expect((await admin.delete(`/admin/categories/${empty.id}`)).status).toBe(204);
    expect((await admin.delete(`/admin/categories/${empty.id}`)).status).toBe(404);
  });
});

describe('admin products', () => {
  it('creates a product with initial stock movement and exposes stock to admins only', async () => {
    const cat = await createCategory(ctx);
    const res = await admin.post('/admin/products', {
      name: 'Taza de café',
      description: 'Cerámica',
      priceCents: 3500_00,
      stock: 12,
      categoryId: cat.id,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Taza de café',
      slug: 'taza-de-cafe',
      priceCents: 350000,
      stock: 12,
      reserved: 0,
      available: 12,
      active: true,
      archivedAt: null,
    });
    const movements = await admin.get(`/admin/products/${res.body.id}/stock-movements`);
    expect(
      movements.body.items.map((m: { reason: string; delta: number }) => [m.reason, m.delta]),
    ).toEqual([['INITIAL', 12]]);
  });

  it('validates price, stock, name and category', async () => {
    const cat = await createCategory(ctx);
    const base = { name: 'P', description: '', priceCents: 100, stock: 1, categoryId: cat.id };
    const cases: Array<[object, string]> = [
      [{ ...base, priceCents: 0 }, 'priceCents'],
      [{ ...base, priceCents: 10.5 }, 'priceCents'],
      [{ ...base, priceCents: 1_000_000_001 }, 'priceCents'],
      [{ ...base, stock: -1 }, 'stock'],
      [{ ...base, stock: 100_001 }, 'stock'],
      [{ ...base, name: '' }, 'name'],
      [{ ...base, categoryId: 'nope' }, 'categoryId'],
      [{ ...base, reserved: 3 }, ''],
    ];
    for (const [body, field] of cases) {
      const res = await admin.post('/admin/products', body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.details[0].field).toBe(field);
    }
    expect(
      (await admin.post('/admin/products', { ...base, priceCents: 1_000_000_000 })).status,
    ).toBe(201);
    const missingCat = await admin.post('/admin/products', {
      ...base,
      categoryId: '00000000-0000-4000-8000-000000000000',
    });
    expect(missingCat.status).toBe(404);
    expect(missingCat.body.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('updates fields (not stock) and keeps search working', async () => {
    const p = await createProduct(ctx, { name: 'Viejo' });
    const res = await admin.patch(`/admin/products/${p.id}`, {
      name: 'Nuevo Ñandú',
      priceCents: 999,
    });
    expect(res.body).toMatchObject({ name: 'Nuevo Ñandú', slug: 'nuevo-nandu', priceCents: 999 });
    expect((await admin.patch(`/admin/products/${p.id}`, { stock: 50 })).status).toBe(400);
    const search = await admin.get('/admin/products?q=nandu');
    expect(search.body.items.map((i: { id: string }) => i.id)).toEqual([p.id]);
  });

  it('DELETE archives (never deletes) and archived products cannot be edited', async () => {
    const p = await createProduct(ctx);
    expect((await admin.delete(`/admin/products/${p.id}`)).status).toBe(204);
    const row = await ctx.prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(row.archivedAt).not.toBeNull();
    expect(row.active).toBe(false);
    const edit = await admin.patch(`/admin/products/${p.id}`, { name: 'X' });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe('PRODUCT_ARCHIVED');
    const list = await admin.get('/admin/products?archived=true');
    expect(list.body.items.map((i: { id: string }) => i.id)).toEqual([p.id]);
    expect((await admin.get('/admin/products')).body.total).toBe(0);
  });

  it('stock adjustment cannot leave stock below reserved (409) and records a movement', async () => {
    const p = await createProduct(ctx, { stock: 10, reserved: 6 });
    const down = await admin.post(`/admin/products/${p.id}/stock`, { delta: -4, note: 'Rotura' });
    expect(down.status).toBe(200);
    expect(down.body).toMatchObject({ stock: 6, reserved: 6, available: 0 });
    const tooMuch = await admin.post(`/admin/products/${p.id}/stock`, {
      delta: -1,
      note: 'Rotura',
    });
    expect(tooMuch.status).toBe(409);
    expect(tooMuch.body.error.code).toBe('STOCK_BELOW_RESERVED');
    expect(await productState(ctx, p.id)).toEqual({ stock: 6, reserved: 6 });
    const up = await admin.post(`/admin/products/${p.id}/stock`, { delta: 5, note: 'Reposición' });
    expect(up.body.stock).toBe(11);
    const overMax = await admin.post(`/admin/products/${p.id}/stock`, {
      delta: 100_000,
      note: 'x',
    });
    expect(overMax.status).toBe(409);
    expect(
      (await admin.post(`/admin/products/${p.id}/stock`, { delta: 0, note: 'x' })).status,
    ).toBe(400);
    expect((await admin.post(`/admin/products/${p.id}/stock`, { delta: 1 })).status).toBe(400);
    const movements = await ctx.prisma.stockMovement.findMany({
      where: { productId: p.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(movements.map((m) => [m.reason, m.delta, m.note, m.actorId])).toEqual([
      ['ADMIN_ADJUSTMENT', -4, 'Rotura', adminId],
      ['ADMIN_ADJUSTMENT', 5, 'Reposición', adminId],
    ]);
  });

  it('concurrent negative adjustments never go below reserved', async () => {
    const p = await createProduct(ctx, { stock: 10, reserved: 4 });
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        admin.post(`/admin/products/${p.id}/stock`, { delta: -1, note: 'Conteo' }),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(6);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await productState(ctx, p.id)).toEqual({ stock: 4, reserved: 4 });
  });
});

describe('product images', () => {
  const upload = (productId: string, buffer: Buffer, filename: string, contentType: string) =>
    admin.agent
      .post(`${API}/admin/products/${productId}/images`)
      .set('Origin', ORIGIN)
      .field('alt', 'Foto')
      .attach('image', buffer, { filename, contentType });

  const png = (w = 40, h = 40) =>
    sharp({ create: { width: w, height: h, channels: 3, background: '#3366ff' } })
      .png()
      .toBuffer();

  function storedFile(url: string) {
    const key = url.split('/uploads/')[1]!;
    return readFileSync(path.join(ctx.uploadDir, key));
  }

  it('re-encodes to WebP, limits to 1600 px and strips EXIF metadata', async () => {
    const p = await createProduct(ctx);
    const jpeg = await sharp({
      create: { width: 3200, height: 1600, channels: 3, background: 'red' },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: 'Secret Owner', ImageDescription: 'GPS -34.6,-58.4' } })
      .toBuffer();
    expect((await sharp(jpeg).metadata()).exif).toBeDefined();

    const res = await upload(p.id, jpeg, 'foto.jpg', 'image/jpeg');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ alt: 'Foto', position: 0 });
    expect(res.body.url).toMatch(
      /^http:\/\/localhost:4000\/uploads\/products\/[0-9a-f-]{36}\.webp$/,
    );
    expect(res.body.url).not.toContain('foto');
    const stored = storedFile(res.body.url);
    const meta = await sharp(stored).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1600);
    expect(meta.height).toBe(800);
    expect(meta.exif).toBeUndefined();
    expect(stored.includes(Buffer.from('Secret Owner'))).toBe(false);

    // Served with nosniff and embeddable from the frontend origin.
    const served = await admin.agent.get(new URL(res.body.url).pathname);
    expect(served.status).toBe(200);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('validates by content: a text file named .jpg is rejected with 415', async () => {
    const p = await createProduct(ctx);
    const res = await upload(p.id, Buffer.from('<?php echo "hola"; ?>'), 'foto.jpg', 'image/jpeg');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_IMAGE_TYPE');
    // A real PNG with a wrong extension is accepted (the content decides).
    const ok = await upload(p.id, await png(), 'imagen.txt', 'text/plain');
    expect(ok.status).toBe(201);
  });

  it('rejects files over 5 MB with 413', async () => {
    const p = await createProduct(ctx);
    const big = Buffer.concat([await png(), Buffer.alloc(5 * 1024 * 1024)]);
    const res = await upload(p.id, big, 'big.png', 'image/png');
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('allows at most 8 images per product', async () => {
    const p = await createProduct(ctx);
    const image = await png();
    for (let i = 0; i < 8; i++) {
      expect((await upload(p.id, image, `${i}.png`, 'image/png')).status).toBe(201);
    }
    const res = await upload(p.id, image, '9.png', 'image/png');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TOO_MANY_IMAGES');
    expect(await ctx.prisma.productImage.count({ where: { productId: p.id } })).toBe(8);
  });

  it('requires multipart: a JSON body is rejected with 415', async () => {
    const p = await createProduct(ctx);
    const res = await admin.post(`/admin/products/${p.id}/images`, { image: 'x' });
    expect(res.status).toBe(415);
  });

  it('deletes and reorders images', async () => {
    const p = await createProduct(ctx);
    const ids: string[] = [];
    for (let i = 0; i < 3; i++)
      ids.push((await upload(p.id, await png(), 'a.png', 'image/png')).body.id);
    const reordered = await admin.put(`/admin/products/${p.id}/images/order`, {
      imageIds: [ids[2], ids[0], ids[1]],
    });
    expect(reordered.status).toBe(200);
    expect(reordered.body.items.map((i: { id: string }) => i.id)).toEqual([ids[2], ids[0], ids[1]]);
    const invalid = await admin.put(`/admin/products/${p.id}/images/order`, { imageIds: [ids[0]] });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_IMAGE_ORDER');

    expect((await admin.delete(`/admin/products/${p.id}/images/${ids[0]}`)).status).toBe(204);
    const remaining = await ctx.prisma.productImage.findMany({
      where: { productId: p.id },
      orderBy: { position: 'asc' },
    });
    expect(remaining.map((i) => [i.id, i.position])).toEqual([
      [ids[2], 0],
      [ids[1], 1],
    ]);
    expect((await admin.delete(`/admin/products/${p.id}/images/${ids[0]}`)).status).toBe(404);
  });
});

describe('settings', () => {
  it('reads and updates the store settings', async () => {
    const initial = await admin.get('/admin/settings');
    expect(initial.body).toEqual({
      storeName: 'Mi tienda',
      shippingCostCents: 0,
      pickupAddress: '',
    });
    const res = await admin.patch('/admin/settings', {
      shippingCostCents: 2500_00,
      storeName: 'La Tienda',
    });
    expect(res.body).toEqual({
      storeName: 'La Tienda',
      shippingCostCents: 250000,
      pickupAddress: '',
    });
    expect((await admin.patch('/admin/settings', { shippingCostCents: -1 })).status).toBe(400);
  });
});
