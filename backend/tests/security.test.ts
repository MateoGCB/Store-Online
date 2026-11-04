import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API, ORIGIN, createTestContext, resetDb, type TestContext } from './helpers.js';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => ctx.close());
beforeEach(async () => resetDb(ctx));

describe('CORS', () => {
  it('allows the configured origin with credentials', async () => {
    const res = await request(ctx.app).get(`${API}/health`).set('Origin', ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow other origins and never answers *', async () => {
    const res = await request(ctx.app).get(`${API}/health`).set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();

    const preflight = await request(ctx.app)
      .options(`${API}/auth/login`)
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(preflight.headers['access-control-allow-origin']).toBeUndefined();

    const ok = await request(ctx.app)
      .options(`${API}/auth/login`)
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'POST');
    expect(ok.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(ok.headers['access-control-allow-origin']).not.toBe('*');
  });
});

describe('CSRF protection (Origin + Content-Type)', () => {
  const body = { email: 'a@example.com', password: 'secreta123' };

  it('rejects a POST from a foreign Origin with 403', async () => {
    const res = await request(ctx.app)
      .post(`${API}/auth/login`)
      .set('Origin', 'https://evil.example')
      .send(body);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('rejects a POST without Origin or Referer', async () => {
    const res = await request(ctx.app).post(`${API}/auth/login`).send(body);
    expect(res.status).toBe(403);
  });

  it('accepts a matching Referer when Origin is missing', async () => {
    const res = await request(ctx.app)
      .post(`${API}/auth/login`)
      .set('Referer', `${ORIGIN}/login?x=1`)
      .send(body);
    expect(res.status).toBe(401);
  });

  it('rejects a foreign Referer', async () => {
    const res = await request(ctx.app)
      .post(`${API}/auth/login`)
      .set('Referer', 'https://evil.example/page')
      .send(body);
    expect(res.status).toBe(403);
  });

  it('rejects a form-encoded POST (415) even from the allowed origin', async () => {
    const res = await request(ctx.app)
      .post(`${API}/auth/login`)
      .set('Origin', ORIGIN)
      .type('form')
      .send('email=a@example.com&password=x');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('applies to DELETE and PATCH too', async () => {
    const del = await request(ctx.app).delete(`${API}/cart`).set('Origin', 'https://evil.example');
    expect(del.status).toBe(403);
    const patch = await request(ctx.app)
      .patch(`${API}/admin/settings`)
      .set('Origin', ORIGIN)
      .set('Content-Type', 'text/plain')
      .send('x');
    expect(patch.status).toBe(415);
  });
});

describe('headers and error format', () => {
  it('sets helmet security headers and no x-powered-by', async () => {
    const res = await request(ctx.app).get(`${API}/health`);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('adds a request id (and reuses a safe incoming one)', async () => {
    const res = await request(ctx.app).get(`${API}/health`);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const reused = await request(ctx.app).get(`${API}/health`).set('X-Request-Id', 'abc-123');
    expect(reused.headers['x-request-id']).toBe('abc-123');
    const unsafe = await request(ctx.app)
      .get(`${API}/health`)
      .set('X-Request-Id', 'bad id <script>');
    expect(unsafe.headers['x-request-id']).not.toBe('bad id <script>');
  });

  it('unknown routes answer the uniform error shape', async () => {
    const res = await request(ctx.app).get(`${API}/does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'ROUTE_NOT_FOUND', message: expect.any(String) } });
  });

  it('invalid JSON answers 400 without a stack trace', async () => {
    const res = await request(ctx.app)
      .post(`${API}/auth/login`)
      .set('Origin', ORIGIN)
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.(ts|js)|stack/i);
  });

  it('a body bigger than 100 kb answers 413', async () => {
    const res = await request(ctx.app)
      .post(`${API}/auth/login`)
      .set('Origin', ORIGIN)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@example.com', password: 'x'.repeat(110 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('validation errors list the fields', async () => {
    const res = await request(ctx.app).get(`${API}/products?pageSize=500&sort=random`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field).sort();
    expect(fields).toEqual(['pageSize', 'sort']);
  });

  it('internal errors answer 500 with a generic message and no details', async () => {
    const broken = await createTestContext();
    await broken.prisma.$disconnect();
    // Point Prisma at a database that does not exist to force an unexpected error.
    const { createPrisma } = await import('../src/db.js');
    const url = new URL(process.env.DATABASE_URL_TEST!);
    url.pathname = '/missing_db_test';
    broken.deps.prisma = createPrisma(url.toString(), 1);
    try {
      const res = await request(broken.app).get(`${API}/categories`);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: expect.any(String) },
      });
      const health = await request(broken.app).get(`${API}/health`);
      expect(health.status).toBe(503);
    } finally {
      await broken.deps.prisma.$disconnect();
      await broken.close();
    }
  });
});
