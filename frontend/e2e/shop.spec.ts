import { test } from '@playwright/test';
import {
  PASSWORD,
  adminApi,
  api,
  createProduct,
  expect,
  pendingOrder,
  stockOf,
  uniqueEmail,
  uniqueName,
} from './support';

test('1. a visitor browses, filters, searches and opens a product', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Objetos de diseño para tu casa',
  );
  await page
    .getByRole('link', { name: /Ver productos/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();

  // Filter by category through the URL-driven form.
  await page.getByLabel('Categoría', { exact: true }).selectOption({ label: 'Jardín' });
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page).toHaveURL(/category=jardin/);
  await expect(page.getByText('en Jardín')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Regadera de zinc' })).toBeVisible();

  // Search ignoring accents from the header.
  const search = page.getByRole('searchbox', { name: 'Buscar productos' });
  await search.fill('ceramica');
  await search.press('Enter');
  await expect(page).toHaveURL(/q=ceramica/);
  await expect(page.getByRole('link', { name: 'Taza de cerámica esmaltada' })).toBeVisible();

  await page.getByRole('link', { name: 'Taza de cerámica esmaltada' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Taza de cerámica esmaltada');
  await expect(page.getByRole('button', { name: 'Agregar al carrito' })).toBeEnabled();
  await expect(page).toHaveTitle(/Taza de cerámica esmaltada/);

  // Back keeps the search.
  await page.goBack();
  await expect(page).toHaveURL(/q=ceramica/);

  // A product without stock shows it and disables the button.
  await page.goto('/products/delantal-de-lino');
  await expect(page.getByRole('button', { name: 'Sin stock' })).toBeDisabled();
});

test('2. register, add to cart, pickup checkout, simulated approved payment -> paid and stock lower', async ({
  page,
}) => {
  const admin = await adminApi();
  const product = await createProduct(admin, { name: uniqueName('Jarra e2e'), stock: 5 });

  await page.goto(`/products/${product.slug}`);
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  // Without a session: login, keeping where we were.
  await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Fproducts%2F${product.slug}`));
  await page.getByRole('link', { name: 'Creá una' }).click();
  // Next keeps the previous page mounted but hidden (React Activity): use visible fields only.
  await page.getByLabel('Nombre').filter({ visible: true }).fill('Compradora E2E');
  await page.getByLabel('Email').filter({ visible: true }).fill(uniqueEmail());
  await page.getByLabel('Contraseña').filter({ visible: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(new RegExp(`/products/${product.slug}$`));

  await page.getByRole('button', { name: 'Sumar una unidad' }).click();
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await expect(page.getByText(`Agregaste 2 unidades de ${product.name} al carrito.`)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Carrito, 2 productos' })).toBeVisible();

  await page.getByRole('link', { name: 'Carrito, 2 productos' }).click();
  await page.getByRole('link', { name: 'Continuar con la compra' }).click();
  await expect(page.getByLabel(/Retiro en el local/)).toBeChecked();
  await page.getByRole('button', { name: 'Ir a pagar' }).click();

  await expect(page).toHaveURL(/\/dev\/simulated-payment\?orderId=/);
  await expect(page.getByText('Modo demo:')).toBeVisible();
  await page.getByRole('button', { name: 'Simular pago aprobado' }).click();

  await expect(page).toHaveURL(/\/checkout\/result\?orderId=/);
  await expect(page.getByRole('heading', { name: '¡Listo! Recibimos tu pago' })).toBeVisible();
  await page.getByRole('link', { name: 'Revisar mi pedido' }).click();
  await expect(page.locator('main').getByText('Pagado', { exact: true }).first()).toBeVisible();

  await page.goto('/account/orders');
  await expect(page.getByText('Pagado', { exact: true }).first()).toBeVisible();

  expect(await stockOf(admin, product.id)).toMatchObject({ stock: 3, reserved: 0, available: 3 });
});

test('3. delivery checkout creating a new address', async ({ page }) => {
  const admin = await adminApi();
  const product = await createProduct(admin, {
    name: uniqueName('Bandeja e2e'),
    stock: 3,
    priceCents: 100_000,
  });
  await api(page.request, 'POST', '/auth/register', {
    name: 'Envío E2E',
    email: uniqueEmail(),
    password: PASSWORD,
  });
  await api(page.request, 'PUT', `/cart/items/${product.id}`, { quantity: 1 });

  await page.goto('/checkout');
  await page.getByLabel(/Envío a domicilio/).check();
  await page.getByRole('button', { name: 'Agregar una dirección nueva' }).click();
  await page.getByLabel('Nombre y apellido de quien recibe').fill('Ana Pérez');
  await page.getByLabel('Teléfono', { exact: true }).fill('11 5555 1234');
  await page.getByLabel('Código postal', { exact: true }).fill('C1043');
  await page.getByLabel('Calle', { exact: true }).fill('Avenida Corrientes');
  await page.getByLabel('Altura', { exact: true }).fill('1234');
  await page.getByLabel('Ciudad', { exact: true }).fill('CABA');
  await page.getByLabel('Provincia', { exact: true }).fill('Buenos Aires');
  await page.getByRole('button', { name: 'Guardar y usar esta dirección' }).click();
  await expect(page.getByLabel(/Avenida Corrientes 1234/)).toBeChecked();

  await page.getByRole('button', { name: 'Ir a pagar' }).click();
  await expect(page).toHaveURL(/\/dev\/simulated-payment/);
  // 1.000 + 3.500 of shipping, computed by the API.
  await expect(page.getByText('Total a pagar:')).toContainText('4.500,00');
  await page.getByRole('button', { name: 'Simular pago aprobado' }).click();
  await expect(page.getByRole('heading', { name: '¡Listo! Recibimos tu pago' })).toBeVisible();
  await page.getByRole('link', { name: 'Revisar mi pedido' }).click();
  await expect(page.getByText('Envío a domicilio')).toBeVisible();
  await expect(page.getByText(/Avenida Corrientes 1234/)).toBeVisible();
});

test('8. cancelling a pending order releases the stock', async ({ page }) => {
  const admin = await adminApi();
  const product = await createProduct(admin, { name: uniqueName('Florero e2e'), stock: 2 });
  const order = await pendingOrder(page.request, product.id, 2);
  expect(await stockOf(admin, product.id)).toMatchObject({ stock: 2, reserved: 2, available: 0 });

  await page.goto(`/account/orders/${order.id}`);
  await expect(page.getByText(/Reservamos tus productos hasta las \d{2}:\d{2}/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar pedido' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sí, cancelar pedido' }).click();
  await expect(page.getByText('Cancelado', { exact: true }).first()).toBeVisible();

  expect(await stockOf(admin, product.id)).toMatchObject({ stock: 2, reserved: 0, available: 2 });
});
