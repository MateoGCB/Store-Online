import AxeBuilder from '@axe-core/playwright';
import { type Page, test } from '@playwright/test';
import path from 'node:path';
import {
  adminApi,
  api,
  createProduct,
  expect,
  pointAt,
  registerViaApi,
  uniqueName,
} from './support';

/** Screenshots go OUTSIDE the repo, only when E2E_SCREENSHOT_DIR is set. */
async function snap(page: Page, name: string) {
  const dir = process.env.E2E_SCREENSHOT_DIR;
  if (dir) await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

/** Console errors, ignoring the browser's own "Failed to load resource" for expected 4xx. */
function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text()))
      errors.push(`${page.url()} -> ${msg.text().slice(0, 160)}`);
  });
  page.on('pageerror', (err) => errors.push(`${page.url()} -> ${String(err).slice(0, 160)}`));
  return errors;
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' | ')}`,
  );
}

test('accessibility (axe, WCAG 2.1 AA) and console on the main screens', async ({ page }) => {
  const admin = await adminApi();
  const product = await createProduct(admin, { name: uniqueName('Vaso e2e'), stock: 4 });
  const errors = collectConsoleErrors(page);
  const report: Record<string, string[]> = {};

  for (const [name, url] of [
    ['inicio', '/'],
    ['catalogo', '/products'],
    ['producto', '/products/taza-de-ceramica-esmaltada'],
    ['ingresar', '/login'],
    ['registro', '/register'],
    ['404', '/no-existe'],
  ] as const) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveCount(1);
    report[name] = await axe(page);
    await snap(page, `desktop-${name}`);
  }

  await registerViaApi(page.request);
  await api(page.request, 'PUT', `/cart/items/${product.id}`, { quantity: 1 });
  for (const [name, url] of [
    ['carrito', '/cart'],
    ['checkout', '/checkout'],
    ['direcciones', '/account/addresses'],
    ['pedidos', '/account/orders'],
  ] as const) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveCount(1);
    report[name] = await axe(page);
    await snap(page, `desktop-${name}`);
  }

  console.log('axe:', JSON.stringify(report, null, 2));
  expect(Object.values(report).flat()).toEqual([]);
  expect(errors).toEqual([]);
});

test('admin screens pass axe too', async ({ page }) => {
  await api(page.request, 'POST', '/auth/login', {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
  });
  const report: Record<string, string[]> = {};
  for (const [name, url] of [
    ['admin-resumen', '/admin'],
    ['admin-productos', '/admin/products'],
    ['admin-nuevo', '/admin/products/new'],
    ['admin-categorias', '/admin/categories'],
    ['admin-pedidos', '/admin/orders'],
    ['admin-config', '/admin/settings'],
  ] as const) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveCount(1);
    report[name] = await axe(page);
    await snap(page, name);
  }
  console.log('axe admin:', JSON.stringify(report, null, 2));
  expect(Object.values(report).flat()).toEqual([]);
});

test('focus pages: login, register and checkout get the reduced header', async ({ page }) => {
  const banner = page.getByRole('banner');
  for (const url of ['/login', '/register']) {
    await page.goto(url);
    await expect(banner.getByRole('link', { name: 'Volver a la tienda' })).toBeVisible();
    await expect(banner.getByRole('search')).toHaveCount(0);
    await expect(banner.getByRole('link', { name: /carrito/i })).toHaveCount(0);
    await expect(banner.getByText('Ingresar')).toHaveCount(0);
    await expect(banner.getByRole('link')).toHaveCount(2);
  }
  // Keyboard: the way back is reachable with Tab and works with Enter.
  await page.goto('/login');
  const back = banner.getByRole('link', { name: 'Volver a la tienda' });
  for (let i = 0; i < 5 && !(await back.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(back).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/$/);
  await expect(banner.getByRole('search')).toBeVisible();

  const admin = await adminApi();
  const product = await createProduct(admin, { name: uniqueName('Foco e2e'), stock: 2 });
  await registerViaApi(page.request);
  await api(page.request, 'PUT', `/cart/items/${product.id}`, { quantity: 1 });
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { level: 1, name: 'Finalizar compra' })).toBeVisible();
  await expect(banner.getByRole('search')).toHaveCount(0);
  await expect(banner.getByRole('button')).toHaveCount(0);
  await expect(banner.getByRole('link')).toHaveCount(2);
  await banner.getByRole('link', { name: 'Volver al carrito' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  // The rest of the store, /checkout/result included, keeps the full header.
  await expect(banner.getByRole('search')).toBeVisible();
  await page.goto('/checkout/result?orderId=00000000-0000-4000-8000-000000000000');
  await expect(banner.getByRole('search')).toBeVisible();
  await expect(banner.getByRole('link', { name: /^Carrito/ })).toBeVisible();
});

test.describe('375 px wide (mobile first)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('catalog filters start collapsed and open with the button', async ({ page }) => {
    await page.goto('/products');
    const category = page.getByLabel('Categoría', { exact: true });
    const toggle = page.getByRole('button', { name: 'Filtros y orden' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(category).toBeHidden();
    await toggle.click();
    await expect(category).toBeVisible();
  });

  test('admin at 375 px: no page overflow and rows still open', async ({ page }) => {
    const admin = await adminApi();
    const product = await createProduct(admin, { name: uniqueName('Movil admin'), stock: 2 });
    await api(page.request, 'POST', '/auth/login', {
      email: process.env.E2E_ADMIN_EMAIL,
      password: process.env.E2E_ADMIN_PASSWORD,
    });
    for (const url of ['/admin/orders', '/admin/products']) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${url} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      await snap(page, `movil-${url.replaceAll('/', '-').slice(1)}`);
    }
    // The table scrolls inside its own box; a tap on the price cell opens the product.
    await page.getByLabel('Buscar').fill(product.name);
    await page.getByRole('button', { name: 'Buscar' }).click();
    const row = page.getByRole('row').filter({ hasText: product.name });
    const overPrice = await pointAt(page, row.getByRole('cell').nth(1));
    expect(overPrice.href).toBe(`/admin/products/${product.id}`);
    await overPrice.click();
    await expect(page).toHaveURL(new RegExp(`/admin/products/${product.id}$`));
  });

  test('no horizontal scroll on the main screens', async ({ page }) => {
    const admin = await adminApi();
    const product = await createProduct(admin, { name: uniqueName('Plato e2e'), stock: 4 });
    const pages: [string, string][] = [
      ['movil-inicio', '/'],
      ['movil-catalogo', '/products'],
      ['movil-producto', `/products/${product.slug}`],
    ];
    await registerViaApi(page.request);
    await api(page.request, 'PUT', `/cart/items/${product.id}`, { quantity: 1 });
    pages.push(
      ['movil-carrito', '/cart'],
      ['movil-checkout', '/checkout'],
      ['movil-ingresar', '/login'],
      ['movil-registro', '/register'],
    );
    for (const [name, url] of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${url} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      await snap(page, name);
    }
  });
});

test('cart and checkout can be used with the keyboard only', async ({ page }) => {
  const admin = await adminApi();
  const product = await createProduct(admin, { name: uniqueName('Taza teclado'), stock: 4 });
  await registerViaApi(page.request);
  await api(page.request, 'PUT', `/cart/items/${product.id}`, { quantity: 1 });

  await page.goto('/cart');
  const plus = page.getByRole('button', { name: 'Sumar una unidad' });
  await plus.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('spinbutton', { name: `Cantidad de ${product.name}` })).toHaveValue(
    '2',
  );

  // Tab to "Continuar con la compra" and follow it with Enter.
  const next = page.getByRole('link', { name: 'Continuar con la compra' });
  for (let i = 0; i < 25 && !(await next.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/checkout$/);

  // Choose delivery with the arrow keys, then go to pay with the keyboard.
  await page.getByLabel(/Retiro en el local/).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel(/Envío a domicilio/)).toBeChecked();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByLabel(/Retiro en el local/)).toBeChecked();
  const pay = page.getByRole('button', { name: 'Ir a pagar' });
  await pay.focus();
  await expect(pay).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dev\/simulated-payment/);
});
