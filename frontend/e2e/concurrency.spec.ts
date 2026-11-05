import { test } from '@playwright/test';
import {
  adminApi,
  api,
  createProduct,
  expect,
  newCustomerPage,
  registerViaApi,
  stockOf,
  uniqueName,
} from './support';

test('4. two customers buy the last unit at the same time: one wins, the other sees "sin stock"', async ({
  browser,
}) => {
  const admin = await adminApi();
  const product = await createProduct(admin, { name: uniqueName('Pieza única'), stock: 1 });

  const buyers = await Promise.all([newCustomerPage(browser), newCustomerPage(browser)]);
  for (const { page } of buyers) {
    await registerViaApi(page.request);
    await api(page.request, 'PUT', `/cart/items/${product.id}`, { quantity: 1 });
    await page.goto('/checkout');
    await expect(page.getByRole('button', { name: 'Ir a pagar' })).toBeEnabled();
  }

  await Promise.all(
    buyers.map(({ page }) => page.getByRole('button', { name: 'Ir a pagar' }).click()),
  );

  const outcomes = await Promise.all(
    buyers.map(async ({ page }) => {
      const won = page.waitForURL(/\/dev\/simulated-payment/).then(() => 'won' as const);
      const lost = page
        .getByText(
          'Algunos productos ya no tienen stock suficiente. Ajustá tu carrito y probá de nuevo.',
        )
        .waitFor()
        .then(() => 'lost' as const);
      return Promise.race([won, lost]);
    }),
  );
  expect([...outcomes].sort()).toEqual(['lost', 'won']);

  const loser = buyers[outcomes.indexOf('lost')]!.page;
  await expect(loser.getByText(`${product.name}: pediste 1, no queda stock.`)).toBeVisible();
  expect(await stockOf(admin, product.id)).toMatchObject({ stock: 1, reserved: 1, available: 0 });

  for (const { context } of buyers) await context.close();
});
