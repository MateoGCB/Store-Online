import { spawnSync } from 'node:child_process';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import {
  API,
  client,
  createProduct,
  createTestContext,
  loggedIn,
  productState,
  resetDb,
  setStoreSettings,
  type TestContext,
} from './helpers.js';

const SIMULATE = (id: string) => `/dev/orders/${id}/simulate-payment`;

describe('PAYMENTS_PROVIDER validation', () => {
  const production = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://u:p@localhost:5433/store',
    JWT_SECRET: 'x'.repeat(40),
    MP_ACCESS_TOKEN: 'TEST-token',
    MP_WEBHOOK_SECRET: 'secret',
  };

  it('rejects PAYMENTS_PROVIDER=fake in production', () => {
    expect(() => loadEnv({ ...production, PAYMENTS_PROVIDER: 'fake' })).toThrow(
      /PAYMENTS_PROVIDER/,
    );
  });

  it('accepts mercadopago in production and fake in development', () => {
    expect(loadEnv({ ...production }).PAYMENTS_PROVIDER).toBe('mercadopago');
    const dev = loadEnv({ ...production, NODE_ENV: 'development', PAYMENTS_PROVIDER: 'fake' });
    expect(dev.PAYMENTS_PROVIDER).toBe('fake');
    expect(() => loadEnv({ ...production, PAYMENTS_PROVIDER: 'paypal' })).toThrow();
  });

  it('the server process refuses to start with fake in production', () => {
    const run = spawnSync('npx', ['tsx', 'src/server.ts'], {
      shell: true,
      encoding: 'utf8',
      timeout: 60_000,
      env: {
        ...process.env,
        ...production,
        PAYMENTS_PROVIDER: 'fake',
        PORT: '4999',
        DOTENV_CONFIG_QUIET: 'true',
      },
    });
    expect(run.status).not.toBe(0);
    expect(run.stderr + run.stdout).toMatch(/PAYMENTS_PROVIDER=fake .*not allowed in production/);
  });
});

describe('without demo mode', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => ctx.close());
  beforeEach(async () => resetDb(ctx));

  it('the simulate-payment route does not exist (404) and is not documented', async () => {
    const { client: c } = await loggedIn(ctx);
    const res = await c.post(SIMULATE('00000000-0000-4000-8000-000000000000'), {
      outcome: 'approved',
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect((await request(ctx.app).get(`${API}/dev/status`)).status).toBe(404);
    const spec = await request(ctx.app).get('/docs/openapi.json');
    expect(Object.keys(spec.body.paths).some((p) => p.includes('/dev/'))).toBe(false);
  });
});

describe('demo mode (PAYMENTS_PROVIDER=fake)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext({ paymentsProvider: 'fake' });
  });
  afterAll(async () => ctx.close());
  beforeEach(async () => {
    await resetDb(ctx);
    await setStoreSettings(ctx);
  });

  async function pendingOrder(quantity = 2, stock = 5) {
    const { client: c, user } = await loggedIn(ctx);
    const p = await createProduct(ctx, { stock, priceCents: 1999_99 });
    await c.put(`/cart/items/${p.id}`, { quantity });
    const res = await c.post('/checkout', { fulfillment: 'PICKUP' });
    expect(res.status).toBe(201);
    return { c, user, productId: p.id, order: res.body.order, paymentUrl: res.body.paymentUrl };
  }

  it('GET /dev/status reports demo mode', async () => {
    const res = await request(ctx.app).get(`${API}/dev/status`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ paymentsProvider: 'fake' });
  });

  it('checkout sends the buyer to the store simulated payment page', async () => {
    const { order, paymentUrl } = await pendingOrder();
    expect(paymentUrl).toBe(`http://localhost:3000/dev/simulated-payment?orderId=${order.id}`);
  });

  it('a simulated approved payment confirms the order like a real webhook', async () => {
    const { c, order, productId } = await pendingOrder(2, 5);
    const res = await c.post(SIMULATE(order.id), { outcome: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');
    expect(res.body.payment).toEqual({ status: 'APPROVED' });
    expect(await productState(ctx, productId)).toEqual({ stock: 3, reserved: 0 });
    const movements = await ctx.prisma.stockMovement.findMany({ where: { orderId: order.id } });
    expect(movements.map((m) => [m.reason, m.delta])).toEqual([['SALE', -2]]);
    const payments = await ctx.prisma.payment.findMany({ where: { orderId: order.id } });
    expect(payments.map((p) => [p.provider, p.status])).toEqual([['simulated', 'APPROVED']]);
    // Coming back to /checkout/result calls sync, which must not apply the payment twice.
    const sync = await c.post(`/orders/${order.id}/sync`);
    expect(sync.body.status).toBe('PAID');
    expect(await productState(ctx, productId)).toEqual({ stock: 3, reserved: 0 });
  });

  it('a simulated rejected payment keeps the order pending', async () => {
    const { c, order, productId } = await pendingOrder(1, 5);
    const res = await c.post(SIMULATE(order.id), { outcome: 'rejected' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING_PAYMENT');
    expect(res.body.payment).toEqual({ status: 'REJECTED' });
    expect(await productState(ctx, productId)).toEqual({ stock: 5, reserved: 1 });
    // Then it can still be paid.
    const ok = await c.post(SIMULATE(order.id), { outcome: 'approved' });
    expect(ok.body.status).toBe('PAID');
  });

  it('validates the outcome and only works on the buyer own order', async () => {
    const { c, order } = await pendingOrder();
    expect((await c.post(SIMULATE(order.id), { outcome: 'maybe' })).status).toBe(400);
    const other = await loggedIn(ctx);
    const res = await other.client.post(SIMULATE(order.id), { outcome: 'approved' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    const anon = await client(ctx.app).post(SIMULATE(order.id), { outcome: 'approved' });
    expect(anon.status).toBe(401);
    expect((await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      'PENDING_PAYMENT',
    );
  });

  it('keeps the CSRF protection (foreign Origin is rejected)', async () => {
    const { order } = await pendingOrder();
    const res = await request(ctx.app)
      .post(`${API}${SIMULATE(order.id)}`)
      .set('Origin', 'https://evil.example')
      .send({ outcome: 'approved' });
    expect(res.status).toBe(403);
  });

  it('is documented in the OpenAPI spec of demo mode', async () => {
    const spec = await request(ctx.app).get('/docs/openapi.json');
    expect(spec.body.paths['/api/v1/dev/orders/{id}/simulate-payment']?.post).toBeDefined();
  });
});
