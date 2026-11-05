import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { MyOrdersView } from '@/components/orders/my-orders-view';
import { adminOrder } from '../support/fixtures';
import { renderWithProviders } from '../support/render';
import { API, server } from '../support/server';

const line = (name: string, quantity: number) => ({
  productId: null,
  name,
  unitPriceCents: 100000,
  quantity,
  lineTotalCents: 100000 * quantity,
});

describe('MyOrdersView', () => {
  it('counts the units of each order in the right number', async () => {
    server.use(
      http.get(`${API}/orders`, () =>
        HttpResponse.json({
          items: [
            adminOrder({ id: 'order-1', number: 1, items: [line('Taza', 1)] }),
            adminOrder({ id: 'order-2', number: 2, items: [line('Taza', 2)] }),
            adminOrder({ id: 'order-3', number: 3, items: [line('Taza', 1), line('Mate', 1)] }),
          ],
          page: 1,
          pageSize: 10,
          total: 3,
        }),
      ),
    );
    renderWithProviders(<MyOrdersView />);

    const unitsOf = async (number: number) => {
      const link = (await screen.findByText(`Pedido #${number}`)).closest('a')!;
      return within(link).getByText(/unidad/).textContent;
    };
    expect(await unitsOf(1)).toMatch(/· 1 unidad$/);
    expect(await unitsOf(2)).toMatch(/· 2 unidades$/);
    expect(await unitsOf(3)).toMatch(/· 2 unidades$/);
  });
});
