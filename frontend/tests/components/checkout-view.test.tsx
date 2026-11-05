import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { vi } from 'vitest';
import { CheckoutView } from '@/components/shop/checkout-view';
import { address, adminOrder, cart, customer, storeInfo } from '../support/fixtures';
import { exactText, renderWithProviders } from '../support/render';
import { API, server } from '../support/server';

const navigation = vi.hoisted(() => ({ goToPayment: vi.fn() }));
vi.mock('@/lib/navigation', () => navigation);

const PAYMENT_URL = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=abc';

beforeEach(() => {
  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json({ user: customer })),
    http.get(`${API}/cart`, () => HttpResponse.json(cart())),
    http.get(`${API}/store-info`, () => HttpResponse.json(storeInfo)),
    http.get(`${API}/addresses`, () => HttpResponse.json({ items: [address] })),
  );
});

async function ready() {
  return screen.findByRole('button', { name: 'Ir a pagar' });
}

describe('CheckoutView', () => {
  it('pickup shows the store address; delivery shows the fixed cost and the addresses', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckoutView />);
    await ready();
    expect(screen.getByLabelText(/Retiro en el local/)).toBeChecked();
    expect(screen.getByText('Calle Falsa 123, Springfield')).toBeInTheDocument();
    expect(screen.queryByText('Dirección de entrega')).not.toBeInTheDocument();
    expect(screen.getByText('Sin cargo')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Envío a domicilio/));
    expect(screen.getByRole('heading', { name: 'Dirección de entrega' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Corrientes 1234/)).toBeChecked();
    // Shipping from store-info; the total row shows subtotal + shipping from the API values.
    expect(screen.getAllByText('$\u00a03.500,00', exactText).length).toBeGreaterThan(0);
    expect(screen.getByText('$\u00a012.500,00', exactText)).toBeInTheDocument();
  });

  it('a double click sends ONE request with an Idempotency-Key and goes to the payment URL', async () => {
    const keys: (string | null)[] = [];
    const bodies: unknown[] = [];
    server.use(
      http.post(`${API}/checkout`, async ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        bodies.push(await request.json());
        await delay(150);
        return HttpResponse.json(
          { order: adminOrder({ status: 'PENDING_PAYMENT' }), paymentUrl: PAYMENT_URL },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<CheckoutView />);
    const button = await ready();
    await user.dblClick(button);
    await user.click(button);
    await waitFor(() => expect(navigation.goToPayment).toHaveBeenCalledWith(PAYMENT_URL));
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^[0-9a-f-]{32,36}$/);
    expect(bodies[0]).toEqual({ fulfillment: 'PICKUP' });
  });

  it('a retry after a network failure reuses the same Idempotency-Key', async () => {
    const keys: (string | null)[] = [];
    server.use(
      http.post(`${API}/checkout`, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        if (keys.length === 1) return HttpResponse.error();
        return HttpResponse.json(
          { order: adminOrder({ status: 'PENDING_PAYMENT' }), paymentUrl: PAYMENT_URL },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<CheckoutView />);
    await user.click(await ready());
    expect(await screen.findByText(/No pudimos conectarnos/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ir a pagar' }));
    await waitFor(() => expect(navigation.goToPayment).toHaveBeenCalled());
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it('409: lists the products without stock and links back to the cart', async () => {
    server.use(
      http.post(`${API}/checkout`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INSUFFICIENT_STOCK',
              message: 'No hay stock suficiente para algunos productos de tu carrito.',
              details: {
                products: [
                  { productId: 'p', name: 'Taza de cerámica', requested: 2, available: 1 },
                ],
              },
            },
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<CheckoutView />);
    await user.click(await ready());
    expect(await screen.findByText(/ya no tienen stock suficiente/)).toBeInTheDocument();
    expect(screen.getByText('Taza de cerámica: pediste 2, quedan 1.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al carrito' })).toHaveAttribute(
      'href',
      '/cart',
    );
    expect(navigation.goToPayment).not.toHaveBeenCalled();
  });

  it('502: tells that the cart was restored', async () => {
    server.use(
      http.post(`${API}/checkout`, () =>
        HttpResponse.json(
          { error: { code: 'PAYMENT_PROVIDER_ERROR', message: 'x' } },
          { status: 502 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<CheckoutView />);
    await user.click(await ready());
    expect(
      await screen.findByText(/No pudimos iniciar el pago\. Tu carrito se restauró/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir a pagar' })).toBeEnabled();
  });

  it('503: explains that online payment is not available', async () => {
    server.use(
      http.post(`${API}/checkout`, () =>
        HttpResponse.json(
          { error: { code: 'PAYMENTS_NOT_CONFIGURED', message: 'x' } },
          { status: 503 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<CheckoutView />);
    await user.click(await ready());
    expect(await screen.findByText(/El pago online no está disponible/)).toBeInTheDocument();
  });

  it('counts the notes characters and limits them to 300', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckoutView />);
    await ready();
    const notes = screen.getByLabelText(/Notas para el pedido/);
    await user.type(notes, 'Hola');
    expect(screen.getByText('4/300 caracteres')).toBeInTheDocument();
    expect(notes).toHaveAttribute('maxLength', '300');
  });
});
