import { headers } from 'next/headers';

/** Public origin of the store, taken from the incoming request (works behind a proxy). */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto.split(',')[0]!.trim()}://${host.split(',')[0]!.trim()}`;
}
