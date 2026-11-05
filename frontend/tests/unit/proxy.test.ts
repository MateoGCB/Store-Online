// @vitest-environment node
import { HttpResponse, http } from 'msw';
import { NextRequest } from 'next/server';
import { config, proxy } from '@/proxy';
import { server } from '../support/server';

const STATUS = 'http://localhost:4000/api/v1/dev/status';
const request = () => new NextRequest('http://localhost:3000/dev/simulated-payment?orderId=x');

describe('proxy for the demo pages (/dev/...)', () => {
  it('only runs on /dev paths', () => {
    expect(config.matcher).toBe('/dev/:path*');
  });

  it('lets the page render when the API simulates payments', async () => {
    server.use(http.get(STATUS, () => HttpResponse.json({ paymentsProvider: 'fake' })));
    const response = await proxy(request());
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('answers the 404 page when demo mode is off (route missing) or the API is down', async () => {
    server.use(
      http.get(STATUS, () =>
        HttpResponse.json({ error: { code: 'ROUTE_NOT_FOUND', message: 'x' } }, { status: 404 }),
      ),
    );
    expect((await proxy(request())).headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/__not-found',
    );
    server.use(http.get(STATUS, () => HttpResponse.error()));
    expect((await proxy(request())).headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/__not-found',
    );
  });
});
