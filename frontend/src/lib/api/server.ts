import { cacheLife, cacheTag } from 'next/cache';
import { ApiError } from './errors';
import type { Category, PublicProduct, PublicProductPage, StoreInfo, User } from './types';

/**
 * Server-side access to the API (Server Components, metadata, sitemap). It talks to
 * API_URL directly; the browser never sees this URL.
 */
const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

async function serverRequest<T>(path: string, cookie?: string): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    cache: 'no-store',
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw ApiError.fromResponse(response.status, data);
  return data as T;
}

// ---------- Public catalog (cached: the backend is the source of truth for stock) ----------

/** Product list for a normalized query string; cached ~60 s. */
export async function getProducts(query: string): Promise<PublicProductPage> {
  'use cache';
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag('products');
  return serverRequest<PublicProductPage>(`/products${query ? `?${query}` : ''}`);
}

/** Product detail; cached ~30 s. Returns null when it does not exist (or is not for sale). */
export async function getProduct(slug: string): Promise<PublicProduct | null> {
  'use cache';
  cacheLife({ stale: 15, revalidate: 30, expire: 300 });
  cacheTag('products');
  try {
    return await serverRequest<PublicProduct>(`/products/${encodeURIComponent(slug)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getCategories(): Promise<Category[]> {
  'use cache';
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag('categories');
  const { items } = await serverRequest<{ items: Category[] }>('/categories');
  return items;
}

export async function getStoreInfo(): Promise<StoreInfo> {
  'use cache';
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag('store-info');
  return serverRequest<StoreInfo>('/store-info');
}

// ---------- Never cached ----------

/** Current user for the given Cookie header (null without a valid session). */
export async function getSessionUser(cookie: string | undefined): Promise<User | null> {
  if (!cookie) return null;
  try {
    const { user } = await serverRequest<{ user: User }>('/auth/me', cookie);
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** True only when the backend runs with simulated payments (PAYMENTS_PROVIDER=fake). */
export async function isPaymentSimulationEnabled(): Promise<boolean> {
  try {
    const status = await serverRequest<{ paymentsProvider: string }>('/dev/status');
    return status.paymentsProvider === 'fake';
  } catch {
    return false;
  }
}
