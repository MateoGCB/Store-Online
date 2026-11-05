import {
  type APIRequestContext,
  type Locator,
  type Page,
  request as playwrightRequest,
  test,
} from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PASSWORD, WEB, adminApi, api, expect, newCustomerPage } from './support';

/**
 * README screenshots (run with `npm run screenshots`, never part of `npm run e2e`).
 * Every person and address below is made up; emails use the reserved example.com domain.
 */
const OUT_DIR = path.resolve(__dirname, '../../docs/screenshots');

/** sharp is a backend dependency: borrow it to save the captures as WebP. */
type Sharp = (input: Buffer) => {
  webp: (options: { quality: number; effort: number }) => { toBuffer: () => Promise<Buffer> };
};
const sharp = createRequire(path.resolve(__dirname, '../../backend/package.json'))(
  'sharp',
) as Sharp;

const CUSTOMER = { name: 'Lucía Fernández', email: 'lucia.fernandez@example.com' };
const OTHER_CUSTOMERS = [
  { name: 'Martín Sosa', email: 'martin.sosa@example.com' },
  { name: 'Carolina Ruiz', email: 'carolina.ruiz@example.com' },
  { name: 'Julián Paz', email: 'julian.paz@example.com' },
];
const ADDRESS = {
  fullName: CUSTOMER.name,
  phone: '11 5555 0000',
  street: 'Calle de los Ejemplos',
  number: '742',
  floorApt: '3° B',
  city: 'Ciudad de Ejemplo',
  province: 'Buenos Aires',
  postalCode: 'B1000',
};

type Status = 'PREPARING' | 'READY_FOR_PICKUP' | 'SHIPPED' | 'DELIVERED';
type Line = [slug: string, quantity: number];

const productIds = new Map<string, string>();
async function productId(request: APIRequestContext, slug: string) {
  if (!productIds.has(slug)) {
    const product = await api<{ id: string }>(request, 'GET', `/products/${slug}`);
    productIds.set(slug, product.id);
  }
  return productIds.get(slug)!;
}

async function fillCart(request: APIRequestContext, lines: Line[]) {
  for (const [slug, quantity] of lines) {
    await api(request, 'PUT', `/cart/items/${await productId(request, slug)}`, { quantity });
  }
}

async function customerSession(customer: { name: string; email: string }) {
  const request = await playwrightRequest.newContext({ baseURL: WEB });
  await api(request, 'POST', '/auth/register', { ...customer, password: PASSWORD });
  return request;
}

/** Places an order, pays it in demo mode and has the admin move it through `path`. */
async function order(
  customer: APIRequestContext,
  admin: APIRequestContext,
  lines: Line[],
  {
    addressId,
    paid = true,
    path: statuses = [],
  }: { addressId?: string; paid?: boolean; path?: Status[] } = {},
) {
  await fillCart(customer, lines);
  const { order } = await api<{ order: { id: string } }>(customer, 'POST', '/checkout', {
    fulfillment: addressId ? 'DELIVERY' : 'PICKUP',
    ...(addressId ? { addressId } : {}),
  });
  if (!paid) return;
  await api(customer, 'POST', `/dev/orders/${order.id}/simulate-payment`, { outcome: 'approved' });
  for (const status of statuses) {
    await api(admin, 'PATCH', `/admin/orders/${order.id}/status`, { status });
  }
}

const VIEWPORT = { width: 1280, height: 900 };

/** Waits for data, fonts and the images above `bottom`, and leaves no hover or focus ring. */
async function settle(page: Page, bottom: number) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    (limit) =>
      Array.from(document.images)
        .filter((img) => img.getBoundingClientRect().top < limit)
        .every((img) => img.complete && img.naturalWidth > 0),
    bottom,
  );
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

/**
 * Saves the viewport as docs/screenshots/<name>.webp. With `until`, the capture is taller
 * than the viewport and ends 24px below that element.
 */
async function capture(page: Page, name: string, until?: Locator) {
  const box = until ? await until.boundingBox() : null;
  const height = box ? Math.ceil(box.y + box.height + 24) : VIEWPORT.height;
  await settle(page, height);
  const png = await page.screenshot({
    animations: 'disabled',
    fullPage: Boolean(box),
    clip: { x: 0, y: 0, width: VIEWPORT.width, height },
  });
  const webp = await sharp(png).webp({ quality: 80, effort: 6 }).toBuffer();
  writeFileSync(path.join(OUT_DIR, `${name}.webp`), webp);
}

test('README screenshots', async ({ browser }) => {
  test.setTimeout(240_000);
  mkdirSync(OUT_DIR, { recursive: true });
  const admin = await adminApi();

  // Some activity from other (made-up) customers for the admin's orders table.
  const [martin, carolina, julian] = await Promise.all(OTHER_CUSTOMERS.map(customerSession));
  await order(martin!, admin, [['espejo-redondo-con-marco-de-yute', 1]], {
    path: ['PREPARING', 'READY_FOR_PICKUP', 'DELIVERED'],
  });
  await order(
    carolina!,
    admin,
    [
      ['set-de-lapices-de-colores', 2],
      ['cuaderno-de-diseno-a5', 1],
    ],
    {
      path: ['PREPARING', 'READY_FOR_PICKUP'],
    },
  );

  // The customer whose screens appear in the README.
  const lucia = await customerSession(CUSTOMER);
  const address = await api<{ id: string }>(lucia, 'POST', '/addresses', ADDRESS);
  await order(
    lucia,
    admin,
    [
      ['taza-de-ceramica-esmaltada', 2],
      ['mate-de-calabaza-forrado', 1],
    ],
    {
      path: ['PREPARING', 'READY_FOR_PICKUP', 'DELIVERED'],
    },
  );
  await order(lucia, admin, [['manta-tejida-a-crochet', 2]], {
    addressId: address.id,
    path: ['PREPARING', 'SHIPPED'],
  });
  await order(lucia, admin, [['vela-de-soja-aromatica', 3]]);
  const julianAddress = await api<{ id: string }>(julian!, 'POST', '/addresses', {
    ...ADDRESS,
    fullName: 'Julián Paz',
    street: 'Pasaje Inventado',
    number: '1500',
    floorApt: '',
  });
  await order(
    julian!,
    admin,
    [
      ['maceta-de-ceramica', 2],
      ['regadera-de-zinc', 1],
    ],
    {
      addressId: julianAddress.id,
      path: ['PREPARING'],
    },
  );
  await order(martin!, admin, [['agenda-semanal-2027', 1]], { paid: false });
  await fillCart(lucia, [
    ['taza-de-ceramica-esmaltada', 2],
    ['canasto-de-mimbre', 1],
    ['almohadon-de-pana', 1],
  ]);

  // Customer screens.
  const { context, page } = await newCustomerPage(browser);
  await page.setViewportSize(VIEWPORT);
  await api(page.request, 'POST', '/auth/login', { email: CUSTOMER.email, password: PASSWORD });

  // Home: hero, categories and the first row of new products.
  await page.goto('/');
  const latest = page.locator('section[aria-labelledby="latest-heading"] li');
  await expect(latest.first()).toBeVisible();
  await capture(page, 'home', latest.first());

  await page.goto('/products/taza-de-ceramica-esmaltada');
  await expect(page.getByRole('button', { name: 'Agregar al carrito' })).toBeEnabled();
  await capture(page, 'product');

  await page.goto('/cart');
  await expect(page.getByRole('link', { name: 'Continuar con la compra' })).toBeVisible();
  await capture(page, 'cart');

  await page.goto('/checkout');
  await page.getByLabel(/Envío a domicilio/).check();
  await expect(page.getByLabel(/Calle de los Ejemplos 742/)).toBeChecked();
  await capture(page, 'checkout');

  await page.goto('/account/orders');
  await expect(page.getByText('Entregado').first()).toBeVisible();
  await capture(page, 'my-orders');
  await context.close();

  // Admin screen.
  const adminView = await newCustomerPage(browser);
  await adminView.page.setViewportSize(VIEWPORT);
  await api(adminView.page.request, 'POST', '/auth/login', {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
  });
  await adminView.page.goto('/admin/orders');
  await expect(adminView.page.getByText(CUSTOMER.name).first()).toBeVisible();
  await capture(adminView.page, 'admin-orders');
  await adminView.context.close();
});
