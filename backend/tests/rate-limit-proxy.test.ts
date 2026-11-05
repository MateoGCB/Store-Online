import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { API, ORIGIN, createTestContext, type TestContext } from './helpers.js';

/**
 * The store's frontend proxies the API, so every request reaches the API from the same
 * address. With TRUST_PROXY=1 the client IP comes from X-Forwarded-For (set by the proxy)
 * and each visitor gets its own limit; without it, X-Forwarded-For is ignored.
 */
let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

const login = (c: TestContext, forwardedFor: string) =>
  request(c.app)
    .post(`${API}/auth/login`)
    .set('Origin', ORIGIN)
    .set('X-Forwarded-For', forwardedFor)
    .send({ email: 'nadie@example.com', password: 'Incorrecta1' });

describe('login rate limit behind a proxy', () => {
  it('TRUST_PROXY=1: two IPs from X-Forwarded-For have independent limits', async () => {
    ctx = await createTestContext({ trustProxy: 1, rateLimits: { loginMax: 2 } });
    expect((await login(ctx, '203.0.113.10')).status).toBe(401);
    expect((await login(ctx, '203.0.113.10')).status).toBe(401);
    expect((await login(ctx, '203.0.113.10')).status).toBe(429);
    // Another visitor behind the same proxy is not blocked by the first one.
    expect((await login(ctx, '198.51.100.20')).status).toBe(401);
    expect((await login(ctx, '198.51.100.20')).status).toBe(401);
    expect((await login(ctx, '198.51.100.20')).status).toBe(429);
  });

  it('TRUST_PROXY=false: X-Forwarded-For is ignored and everyone shares the limit', async () => {
    ctx = await createTestContext({ trustProxy: false, rateLimits: { loginMax: 2 } });
    expect((await login(ctx, '203.0.113.10')).status).toBe(401);
    expect((await login(ctx, '203.0.113.10')).status).toBe(401);
    const other = await login(ctx, '198.51.100.20');
    expect(other.status).toBe(429);
    expect(other.body.error.code).toBe('RATE_LIMITED');
  });
});
