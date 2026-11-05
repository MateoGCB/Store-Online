import AxeBuilder from '@axe-core/playwright';
import { type Page, test } from '@playwright/test';
import path from 'node:path';
import { adminApi, api, createProduct, expect, registerViaApi, uniqueName } from './support';

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
    pages.push(['movil-carrito', '/cart'], ['movil-checkout', '/checkout']);
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
