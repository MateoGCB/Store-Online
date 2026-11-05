import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { OrdersTable } from '@/components/admin/orders-table';
import { ProductsTable } from '@/components/admin/products-table';
import type { AdminProduct } from '@/lib/api/types';
import { adminOrder } from '../support/fixtures';
import { navigation } from '../support/next-mocks';
import { renderWithProviders } from '../support/render';
import { API, server } from '../support/server';

const product: AdminProduct = {
  id: '66666666-6666-4666-8666-666666666666',
  name: 'Mate de calabaza',
  slug: 'mate-de-calabaza',
  description: 'Mate curado.',
  priceCents: 1250000,
  images: [],
  category: { id: '77777777-7777-4777-8777-777777777777', name: 'Cocina', slug: 'cocina' },
  stock: 3,
  reserved: 1,
  available: 2,
  active: true,
  archivedAt: null,
  createdAt: '2026-11-04T12:00:00.000Z',
  updatedAt: '2026-11-04T12:00:00.000Z',
};

/** The stretched-link contract: one real link per row whose ::after covers the row. */
function expectWholeRowLink(row: HTMLElement, name: string, href: string) {
  const links = within(row).getAllByRole('link');
  expect(links).toHaveLength(1);
  const [link] = links;
  expect(link).toHaveAccessibleName(name);
  expect(link).toHaveAttribute('href', href);
  // The link's ::after fills the row (positioned against the relative <tr>).
  expect(row).toHaveClass('relative', 'cursor-pointer');
  expect(link).toHaveClass('after:absolute', 'after:inset-0', "after:content-['']");
  // Visible hover and keyboard focus on the whole row.
  expect(row.className).toMatch(/(^|\s)hover:bg-/);
  expect(row.className).toMatch(/(^|\s)focus-within:bg-/);
  expect(link).toHaveClass('focus-visible:after:outline-2', 'focus-visible:after:outline-accent');
  // No onClick on the row and no extra "Ver" control.
  expect(row).not.toHaveAttribute('onclick');
  expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  expect(within(row).queryByText(/^Ver$/)).not.toBeInTheDocument();
}

describe('admin tables: the whole row opens the detail', () => {
  it('orders: the order number link covers its row (also rows that need attention)', async () => {
    navigation.pathname = '/admin/orders';
    server.use(
      http.get(`${API}/admin/orders`, () =>
        HttpResponse.json({
          items: [
            adminOrder(),
            adminOrder({
              id: '88888888-8888-4888-8888-888888888888',
              number: 43,
              needsAttention: true,
            }),
          ],
          page: 1,
          pageSize: 20,
          total: 2,
        }),
      ),
    );
    renderWithProviders(<OrdersTable />);
    const first = (await screen.findByRole('link', { name: '#42' })).closest('tr')!;
    expectWholeRowLink(first, '#42', '/admin/orders/55555555-5555-4555-8555-555555555555');
    const attention = screen.getByRole('link', { name: '#43' }).closest('tr')!;
    expectWholeRowLink(attention, '#43', '/admin/orders/88888888-8888-4888-8888-888888888888');
    expect(attention).toHaveClass('bg-warning-soft/60', 'hover:bg-warning-soft');
  });

  it('products: the product name link covers its row', async () => {
    server.use(
      http.get(`${API}/admin/products`, () =>
        HttpResponse.json({ items: [product], page: 1, pageSize: 20, total: 1 }),
      ),
    );
    renderWithProviders(<ProductsTable />);
    const row = (await screen.findByRole('link', { name: 'Mate de calabaza' })).closest('tr')!;
    expectWholeRowLink(row, 'Mate de calabaza', `/admin/products/${product.id}`);
  });
});
