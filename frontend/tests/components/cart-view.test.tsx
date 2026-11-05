import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { CartView } from '@/components/shop/cart-view';
import { cart, customer } from '../support/fixtures';
import { exactText, renderWithProviders } from '../support/render';
import { API, server } from '../support/server';

const soldOut = {
  productId: '66666666-6666-4666-8666-666666666666',
  name: 'Maceta',
  slug: 'maceta',
  image: null,
  unitPriceCents: 100000,
  quantity: 1,
  lineTotalCents: 100000,
  maxPurchasable: 0,
  warning: 'OUT_OF_STOCK' as const,
  warningMessage: 'Este producto se quedó sin stock.',
};

beforeEach(() => {
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json({ user: customer })));
});

describe('CartView', () => {
  it('shows the API warning for a product without stock and blocks checkout', async () => {
    const base = cart();
    server.use(
      http.get(`${API}/cart`, () =>
        HttpResponse.json(cart({ items: [...base.items, soldOut], canCheckout: false })),
      ),
    );
    renderWithProviders(<CartView />);
    const line = (await screen.findByText('Maceta')).closest('li')!;
    expect(within(line).getByRole('alert')).toHaveTextContent('Este producto se quedó sin stock.');
    expect(screen.getByRole('button', { name: 'Continuar con la compra' })).toBeDisabled();
    expect(
      screen.getByText('Revisá los productos marcados antes de continuar.'),
    ).toBeInTheDocument();
  });

  it('shows the available quantity when the API answers 409 INSUFFICIENT_STOCK', async () => {
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json(cart())),
      http.put(`${API}/cart/items/:productId`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INSUFFICIENT_STOCK',
              message: 'Solo hay 2 unidades disponibles.',
              details: { productId: '44444444-4444-4444-8444-444444444444', available: 2 },
            },
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<CartView />);
    await user.click(await screen.findByRole('button', { name: 'Sumar una unidad' }));
    expect(await screen.findByText('Solo quedan 2 unidades disponibles.')).toBeInTheDocument();
  });

  it('shows the server subtotal and an empty state', async () => {
    server.use(http.get(`${API}/cart`, () => HttpResponse.json(cart())));
    const { unmount } = renderWithProviders(<CartView />);
    const summary = await screen.findByRole('complementary', { name: 'Resumen' });
    expect(within(summary).getByText('$\u00a09.000,00', exactText)).toBeInTheDocument();
    unmount();
    server.use(
      http.get(`${API}/cart`, () =>
        HttpResponse.json(cart({ items: [], subtotalCents: 0, itemCount: 0, canCheckout: false })),
      ),
    );
    renderWithProviders(<CartView />);
    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument();
  });
});
