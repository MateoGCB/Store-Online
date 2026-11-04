import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import argon2 from 'argon2';
import type { Express } from 'express';
import request from 'supertest';
import { createApp, type AppOptions } from '../src/app.js';
import { assertTestDatabase, loadEnv } from '../src/config/env.js';
import { createPrisma } from '../src/db.js';
import type { Deps } from '../src/deps.js';
import { FixedClock } from '../src/lib/clock.js';
import { createLogger } from '../src/logger.js';
import { LocalStorage } from '../src/storage/local.storage.js';

export const ORIGIN = 'http://localhost:3000';
export const WEBHOOK_SECRET = 'test-webhook-secret-0123456789';
export const PASSWORD = 'Password123';
export const API = '/api/v1';

export interface TestContext {
  app: Express;
  deps: Deps;
  prisma: Deps['prisma'];
  clock: FixedClock;
  uploadDir: string;
  close: () => Promise<void>;
}

export async function createTestContext(
  options: AppOptions & { start?: Date } = {},
): Promise<TestContext> {
  const base = loadEnv({ ...process.env, NODE_ENV: 'test' });
  const url = base.DATABASE_URL_TEST!;
  assertTestDatabase(url);
  const uploadDir = mkdtempSync(path.join(tmpdir(), 'store-uploads-'));
  const env = {
    ...base,
    DATABASE_URL: url,
    UPLOAD_DIR: uploadDir,
    MP_WEBHOOK_SECRET: WEBHOOK_SECRET,
    MP_ACCESS_TOKEN: undefined,
    CORS_ORIGINS: [ORIGIN],
    PUBLIC_API_URL: 'http://localhost:4000',
    FRONTEND_URL: 'http://localhost:3000',
    RESERVATION_MINUTES: 30,
  };
  const prisma = createPrisma(url, 25);
  const clock = new FixedClock(options.start ?? new Date('2026-11-04T12:00:00.000Z'));
  const deps: Deps = {
    env,
    prisma,
    clock,
    payments: null,
    storage: new LocalStorage(uploadDir, env.PUBLIC_API_URL),
    logger: createLogger(env),
  };
  const app = createApp(deps, {
    rateLimits: {
      loginMax: 10_000,
      registerMax: 10_000,
      checkoutMax: 10_000,
      ...options.rateLimits,
    },
  });
  return {
    app,
    deps,
    prisma,
    clock,
    uploadDir,
    close: async () => {
      await prisma.$disconnect();
      rmSync(uploadDir, { recursive: true, force: true });
    },
  };
}

/** Empties every table (keeps the schema and migrations). */
export async function resetDb(ctx: TestContext) {
  await ctx.prisma.$executeRawUnsafe(`
    TRUNCATE TABLE webhook_events, payments, stock_movements, order_items, orders,
      cart_items, carts, addresses, product_images, products, categories, users, store_settings
    RESTART IDENTITY CASCADE`);
}

/** HTTP client that keeps the session cookie and sends the headers browsers would send. */
export function client(app: Express) {
  const agent = request.agent(app);
  const json = (t: request.Test) => t.set('Origin', ORIGIN).set('Content-Type', 'application/json');
  return {
    agent,
    get: (url: string) => agent.get(API + url),
    post: (url: string, body?: object) =>
      body === undefined ? json(agent.post(API + url)) : json(agent.post(API + url)).send(body),
    put: (url: string, body?: object) =>
      body === undefined ? json(agent.put(API + url)) : json(agent.put(API + url)).send(body),
    patch: (url: string, body?: object) =>
      body === undefined ? json(agent.patch(API + url)) : json(agent.patch(API + url)).send(body),
    delete: (url: string) => json(agent.delete(API + url)),
  };
}
export type Client = ReturnType<typeof client>;

let cachedHash: Promise<string> | undefined;
function passwordHash() {
  cachedHash ??= argon2.hash(PASSWORD);
  return cachedHash;
}

let userSeq = 0;
export async function createUser(
  ctx: TestContext,
  data: { email?: string; name?: string; role?: 'CUSTOMER' | 'ADMIN' } = {},
) {
  userSeq++;
  return ctx.prisma.user.create({
    data: {
      email: data.email ?? `user${userSeq}-${Date.now()}@example.com`,
      name: data.name ?? `User ${userSeq}`,
      role: data.role ?? 'CUSTOMER',
      passwordHash: await passwordHash(),
    },
  });
}

/** Creates a user and returns a logged-in client for it. */
export async function loggedIn(
  ctx: TestContext,
  data: { email?: string; name?: string; role?: 'CUSTOMER' | 'ADMIN' } = {},
) {
  const user = await createUser(ctx, data);
  const c = client(ctx.app);
  const res = await c.post('/auth/login', { email: user.email, password: PASSWORD });
  if (res.status !== 200)
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { user, client: c };
}

let catSeq = 0;
export async function createCategory(ctx: TestContext, name?: string) {
  catSeq++;
  const n = name ?? `Categoría ${catSeq}`;
  return ctx.prisma.category.create({
    data: { name: n, slug: `cat-${catSeq}-${Date.now()}` },
  });
}

let prodSeq = 0;
export async function createProduct(
  ctx: TestContext,
  data: {
    name?: string;
    description?: string;
    priceCents?: number;
    stock?: number;
    reserved?: number;
    active?: boolean;
    archived?: boolean;
    categoryId?: string;
    createdAt?: Date;
    searchText?: string;
  } = {},
) {
  prodSeq++;
  const categoryId = data.categoryId ?? (await createCategory(ctx)).id;
  const name = data.name ?? `Producto ${prodSeq}`;
  const description = data.description ?? 'Descripción de prueba';
  return ctx.prisma.product.create({
    data: {
      name,
      slug: `producto-${prodSeq}-${Date.now()}`,
      description,
      searchText:
        data.searchText ??
        `${name} ${description}`.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(),
      priceCents: data.priceCents ?? 100_00,
      stock: data.stock ?? 10,
      reserved: data.reserved ?? 0,
      active: data.active ?? true,
      archivedAt: data.archived ? new Date() : null,
      categoryId,
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
    },
  });
}

export async function setStoreSettings(ctx: TestContext, shippingCostCents = 1500_00) {
  return ctx.prisma.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, storeName: 'Tienda Test', shippingCostCents, pickupAddress: 'Calle 1' },
    update: { shippingCostCents },
  });
}

export async function productState(ctx: TestContext, id: string) {
  const p = await ctx.prisma.product.findUniqueOrThrow({ where: { id } });
  return { stock: p.stock, reserved: p.reserved };
}
