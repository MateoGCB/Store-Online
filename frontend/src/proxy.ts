import { NextResponse, type NextRequest } from 'next/server';

const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

/**
 * The demo pages (/dev/...) only exist when the API simulates payments
 * (PAYMENTS_PROVIDER=fake). The check runs here, before rendering, so the answer is a real
 * HTTP 404 (a notFound() inside a streamed page can only keep the 200 status).
 */
export async function proxy(request: NextRequest) {
  const enabled = await fetch(`${API_URL}/api/v1/dev/status`, { cache: 'no-store' })
    .then((response) => response.ok)
    .catch(() => false);
  if (enabled) return NextResponse.next();
  // An unknown route renders the store's 404 page with a 404 status.
  return NextResponse.rewrite(new URL('/__not-found', request.url));
}

export const config = {
  matcher: '/dev/:path*',
};
