import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  API,
  ORIGIN,
  PASSWORD,
  client,
  createTestContext,
  createUser,
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

function cookieHeader(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return (raw ?? []).find((c) => c.startsWith('session=')) ?? '';
}

describe('register', () => {
  it('creates the account, normalizes the email and starts a session', async () => {
    const c = client(ctx.app);
    const res = await c.post('/auth/register', {
      name: '  Ana Pérez  ',
      email: '  Ana.Perez@Example.COM ',
      password: 'secreta123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: 'ana.perez@example.com',
      name: 'Ana Pérez',
      role: 'CUSTOMER',
    });
    expect(JSON.stringify(res.body)).not.toContain('password');
    const me = await c.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('ana.perez@example.com');
  });

  it('rejects a duplicate email regardless of case with 409', async () => {
    await createUser(ctx, { email: 'dup@example.com' });
    const res = await client(ctx.app).post('/auth/register', {
      name: 'Otro',
      email: 'DUP@Example.com',
      password: 'secreta123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('accepts a password of exactly 72 bytes and rejects 73 bytes', async () => {
    const ok = 'a1' + 'b'.repeat(70); // 72 bytes
    const tooLong = 'a1' + 'b'.repeat(71); // 73 bytes
    const r1 = await client(ctx.app).post('/auth/register', {
      name: 'A',
      email: 'a72@example.com',
      password: ok,
    });
    expect(r1.status).toBe(201);
    const r2 = await client(ctx.app).post('/auth/register', {
      name: 'B',
      email: 'b73@example.com',
      password: tooLong,
    });
    expect(r2.status).toBe(400);
    expect(r2.body.error.code).toBe('VALIDATION_ERROR');
    expect(r2.body.error.details[0].field).toBe('password');
  });

  it('counts bytes, not characters: 40 accented characters (79 bytes) are rejected', async () => {
    const password = 'á'.repeat(39) + '1'; // 40 characters, 39*2+1 = 79 bytes
    expect(password.length).toBe(40);
    const res = await client(ctx.app).post('/auth/register', {
      name: 'C',
      email: 'c@example.com',
      password,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('password');
  });

  it.each([
    ['short', 'abc1234'],
    ['without a number', 'abcdefghij'],
    ['without a letter', '1234567890'],
  ])('rejects a password %s', async (_label, password) => {
    const res = await client(ctx.app).post('/auth/register', {
      name: 'D',
      email: 'd@example.com',
      password,
    });
    expect(res.status).toBe(400);
  });

  it('validates name and email', async () => {
    const res = await client(ctx.app).post('/auth/register', {
      name: '   ',
      email: 'no-es-un-email',
      password: 'secreta123',
    });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field).sort();
    expect(fields).toEqual(['email', 'name']);
  });
});

describe('login / session', () => {
  it('sets an HttpOnly, SameSite=Lax cookie for 12 hours (not Secure outside production)', async () => {
    const user = await createUser(ctx, { email: 'login@example.com' });
    const res = await client(ctx.app).post('/auth/login', {
      email: 'LOGIN@example.com',
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    const cookie = cookieHeader(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=43200/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it('answers the same generic 401 for a wrong password and an unknown email', async () => {
    await createUser(ctx, { email: 'known@example.com' });
    const wrong = await client(ctx.app).post('/auth/login', {
      email: 'known@example.com',
      password: 'Incorrecta1',
    });
    const unknown = await client(ctx.app).post('/auth/login', {
      email: 'nobody@example.com',
      password: 'Incorrecta1',
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(cookieHeader(wrong)).toBe('');
  });

  it('logout clears the cookie and the session is gone', async () => {
    const { client: c } = await loggedIn(ctx);
    expect((await c.get('/auth/me')).status).toBe(200);
    const out = await c.post('/auth/logout');
    expect(out.status).toBe(204);
    expect(cookieHeader(out)).toMatch(/session=;/);
    expect((await c.get('/auth/me')).status).toBe(401);
  });

  it('without a session /auth/me is a generic 401', async () => {
    const res = await request(ctx.app).get(`${API}/auth/me`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'UNAUTHENTICATED', message: expect.any(String) },
    });
  });

  it('rejects a tampered token', async () => {
    const res = await request(ctx.app)
      .get(`${API}/auth/me`)
      .set('Cookie', 'session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.invalid');
    expect(res.status).toBe(401);
  });

  it('reads the role from the database on every request', async () => {
    const { user, client: c } = await loggedIn(ctx);
    expect((await c.get('/admin/settings')).status).toBe(403);
    await ctx.prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    expect((await c.get('/admin/settings')).status).toBe(200);
  });

  it('a customer on an admin route gets 403, anonymous gets 401', async () => {
    const { client: c } = await loggedIn(ctx);
    const res = await c.get('/admin/settings');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    const anon = await request(ctx.app).get(`${API}/admin/settings`);
    expect(anon.status).toBe(401);
  });

  it('a session expires after 12 hours', async () => {
    const { client: c } = await loggedIn(ctx);
    ctx.clock.advanceMinutes(12 * 60 + 1);
    expect((await c.get('/auth/me')).status).toBe(401);
    ctx.clock.advanceMinutes(-(12 * 60 + 1));
  });
});

describe('rate limit', () => {
  it('blocks login after the configured number of attempts with 429', async () => {
    const limited = await createTestContext({ rateLimits: { loginMax: 3, registerMax: 2 } });
    try {
      const attempt = () =>
        request(limited.app)
          .post(`${API}/auth/login`)
          .set('Origin', ORIGIN)
          .send({ email: 'x@example.com', password: 'whatever1' });
      expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(401);
      const blocked = await attempt();
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');

      const register = (n: number) =>
        request(limited.app)
          .post(`${API}/auth/register`)
          .set('Origin', ORIGIN)
          .send({ name: 'R', email: `r${n}@example.com`, password: 'secreta123' });
      expect((await register(1)).status).toBe(201);
      expect((await register(2)).status).toBe(201);
      expect((await register(3)).status).toBe(429);
    } finally {
      await limited.close();
    }
  });
});
