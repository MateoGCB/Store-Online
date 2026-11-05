import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { vi } from 'vitest';
import { OrderActions } from '@/components/admin/admin-order-detail';
import type { AdminOrder } from '@/lib/api/types';
import { adminOrder } from '../support/fixtures';
import { renderWithProviders } from '../support/render';
import { API, server } from '../support/server';

function buttons() {
  return screen.queryAllByRole('button').map((b) => b.textContent?.trim());
}

describe('admin order actions (only valid transitions)', () => {
  it.each<[AdminOrder['status'], AdminOrder['fulfillment'], string[]]>([
    ['PAID', 'PICKUP', ['Empezar a preparar', 'Cancelar pedido']],
    ['PAID', 'DELIVERY', ['Empezar a preparar', 'Cancelar pedido']],
    ['PREPARING', 'PICKUP', ['Marcar como listo para retirar', 'Cancelar pedido']],
    ['PREPARING', 'DELIVERY', ['Marcar como enviado', 'Cancelar pedido']],
    ['READY_FOR_PICKUP', 'PICKUP', ['Marcar como entregado', 'Cancelar pedido']],
    ['SHIPPED', 'DELIVERY', ['Marcar como entregado']],
    ['PENDING_PAYMENT', 'PICKUP', []],
    ['DELIVERED', 'DELIVERY', []],
    ['CANCELLED', 'PICKUP', []],
    ['EXPIRED', 'DELIVERY', []],
  ])('%s + %s shows %j', (status, fulfillment, expected) => {
    renderWithProviders(
      <OrderActions order={adminOrder({ status, fulfillment })} onRefetch={() => {}} />,
    );
    expect(buttons()).toEqual(expected);
    if (expected.length === 0) {
      expect(screen.getByText('No hay acciones disponibles para este estado.')).toBeInTheDocument();
    }
  });

  it('a PAID order never offers "Entregar"', () => {
    renderWithProviders(
      <OrderActions order={adminOrder({ status: 'PAID' })} onRefetch={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: /entregado/i })).not.toBeInTheDocument();
  });

  it('sends fromStatus and handles a concurrent change (409)', async () => {
    let body: unknown;
    server.use(
      http.patch(`${API}/admin/orders/:id/status`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            error: {
              code: 'ORDER_STATUS_CHANGED',
              message: 'El estado del pedido cambió mientras lo editabas.',
            },
          },
          { status: 409 },
        );
      }),
    );
    const onRefetch = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <OrderActions order={adminOrder({ status: 'PAID' })} onRefetch={onRefetch} />,
    );
    await user.click(screen.getByRole('button', { name: 'Empezar a preparar' }));
    expect(
      await screen.findByText('El pedido cambió, actualizamos los datos.'),
    ).toBeInTheDocument();
    expect(body).toEqual({ status: 'PREPARING', fromStatus: 'PAID' });
    expect(onRefetch).toHaveBeenCalled();
  });

  it('cancelling requires a reason', async () => {
    let calls = 0;
    server.use(
      http.post(`${API}/admin/orders/:id/cancel`, () => {
        calls++;
        return HttpResponse.json(adminOrder({ status: 'CANCELLED' }));
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <OrderActions order={adminOrder({ status: 'PAID' })} onRefetch={() => {}} />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    expect(await screen.findByText('Contá el motivo de la cancelación.')).toBeInTheDocument();
    expect(calls).toBe(0);
    await user.type(screen.getByLabelText('Motivo'), 'Sin stock real');
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    await waitFor(() => expect(calls).toBe(1));
  });
});
