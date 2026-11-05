import { type Page, test } from '@playwright/test';
import {
  ADMIN,
  TINY_PNG,
  adminApi,
  api,
  createProduct,
  expect,
  newCustomerPage,
  pointAt,
  pendingOrder,
  registerViaApi,
  uniqueName,
} from './support';

async function loginAsAdmin(page: Page) {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)admin$/);
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Contraseña').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
}

test('5. a customer cannot enter /admin (and the API answers 403)', async ({ page }) => {
  await registerViaApi(page.request);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'No tenés permisos' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Administración' })).toHaveCount(0);
  const response = await page.request.get('/api/v1/admin/stats');
  expect(response.status()).toBe(403);
});

test('6. the admin creates a product with an image and it appears in the catalog', async ({
  page,
}) => {
  const name = uniqueName('Lámpara e2e');
  await loginAsAdmin(page);
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Productos' })
    .click();
  await page.getByRole('link', { name: 'Nuevo producto' }).click();
  await page.getByLabel('Nombre').fill(name);
  await page.getByLabel('Descripción').fill('Lámpara de mesa con pantalla de lino.');
  await page.getByLabel('Precio (en pesos)').fill('19999,99');
  await page.getByLabel('Categoría').selectOption({ label: 'Hogar' });
  await page.getByLabel('Stock inicial').fill('4');
  await page.getByRole('button', { name: 'Crear producto' }).click();

  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await page
    .getByLabel('Agregar imagen')
    .setInputFiles({ name: 'lampara.png', mimeType: 'image/png', buffer: TINY_PNG });
  await expect(page.getByAltText('Vista previa de la imagen elegida')).toBeVisible();
  await page.getByRole('button', { name: 'Subir imagen' }).click();
  await expect(page.getByText('Subimos la imagen.')).toBeVisible();
  await expect(page.getByText('1 de 8')).toBeVisible();

  await page.goto(`/products?q=${encodeURIComponent(name)}`);
  const card = page.getByRole('listitem').filter({ hasText: name });
  await expect(card).toBeVisible();
  await expect(card).toContainText('19.999,99');
  await expect(card.getByRole('img')).toHaveAttribute(
    'src',
    /_next\/image\?url=%2Fuploads%2Fproducts%2F/,
  );
});

test('7. the admin moves an order PAID -> PREPARING -> READY_FOR_PICKUP -> DELIVERED and the customer sees it', async ({
  page,
  browser,
}) => {
  const admin = await adminApi();
  const product = await createProduct(admin, { name: uniqueName('Cuenco e2e'), stock: 3 });
  const customer = await newCustomerPage(browser);
  const order = await pendingOrder(customer.page.request, product.id, 1);
  await api(customer.page.request, 'POST', `/dev/orders/${order.id}/simulate-payment`, {
    outcome: 'approved',
  });

  await loginAsAdmin(page);
  // Clicking anywhere on the row (here the delivery cell, not the link) opens the order.
  await page.goto(`/admin/orders?number=${order.number}`);
  const row = page.getByRole('row').filter({ hasText: `#${order.number}` });
  const overDelivery = await pointAt(page, row.getByRole('cell', { name: 'Retiro en el local' }));
  expect(overDelivery.href).toBe(`/admin/orders/${order.id}`);
  await overDelivery.click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${order.id}$`));
  await expect(
    page.getByRole('heading', { level: 1, name: `Pedido #${order.number}` }),
  ).toBeVisible();
  // A PAID pickup order offers only the next step and cancel.
  await expect(page.getByRole('button', { name: 'Marcar como entregado' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Marcar como enviado' })).toHaveCount(0);

  for (const action of ['Empezar a preparar', 'Listo para retirar', 'Marcar como entregado']) {
    await page.getByRole('button', { name: action }).click();
    await expect(page.getByText('Actualizamos el estado del pedido.').last()).toBeVisible();
  }
  await expect(page.getByText('Entregado', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('No hay acciones disponibles para este estado.')).toBeVisible();

  await customer.page.goto(`/account/orders/${order.id}`);
  await expect(customer.page.getByText('Entregado', { exact: true }).first()).toBeVisible();
  await expect(
    customer.page.getByText('Tu pedido fue entregado. ¡Gracias por tu compra!'),
  ).toBeVisible();
  await customer.context.close();
});

test('9. admin tables: the whole row is one real link (keyboard focus is visible)', async ({
  page,
}) => {
  const admin = await adminApi();
  const product = await createProduct(admin, { name: uniqueName('Fila e2e'), stock: 2 });
  await loginAsAdmin(page);
  await page.goto('/admin/products');
  await page.getByLabel('Buscar').fill(product.name);
  await page.getByRole('button', { name: 'Buscar' }).click();
  const row = page.getByRole('row').filter({ hasText: product.name });
  await expect(row.getByRole('link')).toHaveCount(1);
  await expect(row.getByRole('button')).toHaveCount(0);

  // Over any part of the row (here the stock cell) the pointer is on the product link, with
  // the hand cursor, and the row is highlighted.
  const before = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
  const overStock = await pointAt(page, row.getByRole('cell').nth(2));
  expect(overStock.href).toBe(`/admin/products/${product.id}`);
  expect(overStock.cursor).toBe('pointer');
  await expect
    .poll(() => row.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(before);
  await page.mouse.move(0, 0);

  // Keyboard: Tab reaches the link, the outline is drawn around the whole row, Enter opens it.
  const link = row.getByRole('link', { name: product.name });
  await page.getByLabel('Mostrar').focus();
  for (let i = 0; i < 6 && !(await link.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(link).toBeFocused();
  const ring = await link.evaluate((el) => {
    const after = getComputedStyle(el, '::after');
    return {
      style: after.outlineStyle,
      width: Math.round(parseFloat(after.width)),
      rowWidth: Math.round(el.closest('tr')!.getBoundingClientRect().width),
    };
  });
  expect(ring.style).toBe('solid');
  expect(ring.width).toBe(ring.rowWidth);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/admin/products/${product.id}$`));
  await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible();
});
