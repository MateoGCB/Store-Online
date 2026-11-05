import {
  type APIRequestContext,
  type Browser,
  type Locator,
  type Page,
  expect,
  request as playwrightRequest,
} from '@playwright/test';

export const WEB = `http://localhost:${process.env.E2E_WEB_PORT ?? 3100}`;
export const PASSWORD = 'Clave-e2e-123';
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? '',
  password: process.env.E2E_ADMIN_PASSWORD ?? '',
};

/** 1x1 PNG used to test image uploads. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
);

let seq = 0;
export function uniqueEmail(prefix = 'cliente'): string {
  seq++;
  return `${prefix}-${Date.now()}-${seq}@example.com`;
}

export function uniqueName(prefix: string): string {
  seq++;
  return `${prefix} ${Date.now().toString(36)}${seq}`;
}

/**
 * Calls the API through the store's proxy with the headers a browser would send (same
 * Origin and JSON). Uses the cookies of the given request context.
 */
export async function api<T = unknown>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const response = await request.fetch(`${WEB}/api/v1${path}`, {
    method,
    data: data === undefined ? undefined : JSON.stringify(data),
    headers: { Origin: WEB, 'Content-Type': 'application/json' },
  });
  const body = response.status() === 204 ? undefined : await response.json();
  if (!response.ok()) {
    throw new Error(`${method} ${path} -> ${response.status()} ${JSON.stringify(body)}`);
  }
  return body as T;
}

export async function registerViaApi(request: APIRequestContext, name = 'Cliente E2E') {
  const email = uniqueEmail();
  await api(request, 'POST', '/auth/register', { name, email, password: PASSWORD });
  return { email, name };
}

/** Separate API session logged in as the seeded admin. */
export async function adminApi(): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL: WEB });
  await api(context, 'POST', '/auth/login', ADMIN);
  return context;
}

export async function createProduct(
  admin: APIRequestContext,
  { name, stock, priceCents = 250_000 }: { name: string; stock: number; priceCents?: number },
) {
  const { items } = await api<{ items: { id: string }[] }>(admin, 'GET', '/admin/categories');
  return api<{ id: string; slug: string; name: string }>(admin, 'POST', '/admin/products', {
    name,
    description: 'Producto creado por las pruebas de punta a punta.',
    priceCents,
    stock,
    categoryId: items[0]!.id,
  });
}

export async function stockOf(admin: APIRequestContext, productId: string) {
  return api<{ stock: number; reserved: number; available: number }>(
    admin,
    'GET',
    `/admin/products/${productId}`,
  );
}

/** Customer with a pending (unpaid) order for `quantity` units of the product. */
export async function pendingOrder(request: APIRequestContext, productId: string, quantity = 1) {
  await registerViaApi(request);
  await api(request, 'PUT', `/cart/items/${productId}`, { quantity });
  const { order } = await api<{ order: { id: string; number: number } }>(
    request,
    'POST',
    '/checkout',
    {
      fulfillment: 'PICKUP',
    },
  );
  return order;
}

export async function newCustomerPage(browser: Browser) {
  const context = await browser.newContext({
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  });
  const page = await context.newPage();
  return { context, page };
}

/**
 * Moves the real mouse to the center of `target` (a table cell, for example) and returns
 * what is under the pointer there. Locator.hover/click refuse to act when another element
 * covers the target, which is exactly what a stretched row link does on purpose.
 */
export async function pointAt(page: Page, target: Locator) {
  // Like a person would: scroll it into view first (tables scroll inside their box on mobile).
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error('target is not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  const under = await page.evaluate(
    ([px, py]) => {
      const el = document.elementFromPoint(px, py);
      const link = el?.closest('a');
      return {
        href: link?.getAttribute('href') ?? null,
        cursor: el ? getComputedStyle(el).cursor : '',
      };
    },
    [x, y] as const,
  );
  return { ...under, click: () => page.mouse.click(x, y) };
}

export { expect };
