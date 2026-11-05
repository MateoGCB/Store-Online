import type { Fulfillment, OrderStatus } from '@/lib/api/types';
import {
  ADMIN_TRANSITIONS,
  ORDER_STATUS_LABELS,
  availableTransitions,
  canAdminCancel,
  canCustomerPayOrCancel,
} from '@/lib/orders/status';

const ALL: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PREPARING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
];

/** Hand-written expectations: which targets each (status, fulfillment) may offer. */
const EXPECTED: Record<Fulfillment, Record<OrderStatus, OrderStatus[]>> = {
  PICKUP: {
    PENDING_PAYMENT: [],
    PAID: ['PREPARING'],
    PREPARING: ['READY_FOR_PICKUP'],
    READY_FOR_PICKUP: ['DELIVERED'],
    SHIPPED: [],
    DELIVERED: [],
    CANCELLED: [],
    EXPIRED: [],
  },
  DELIVERY: {
    PENDING_PAYMENT: [],
    PAID: ['PREPARING'],
    PREPARING: ['SHIPPED'],
    READY_FOR_PICKUP: [],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
    EXPIRED: [],
  },
};

describe('admin order transitions', () => {
  for (const fulfillment of ['PICKUP', 'DELIVERY'] as const) {
    for (const status of ALL) {
      it(`${fulfillment} ${status} -> [${EXPECTED[fulfillment][status].join(', ')}]`, () => {
        expect(availableTransitions(status, fulfillment).map((t) => t.to)).toEqual(
          EXPECTED[fulfillment][status],
        );
      });
    }
  }

  it('pickup orders never offer SHIPPED and delivery orders never offer READY_FOR_PICKUP', () => {
    for (const status of ALL) {
      expect(availableTransitions(status, 'PICKUP').map((t) => t.to)).not.toContain('SHIPPED');
      expect(availableTransitions(status, 'DELIVERY').map((t) => t.to)).not.toContain(
        'READY_FOR_PICKUP',
      );
    }
  });

  it('admin can cancel only from PAID, PREPARING and READY_FOR_PICKUP', () => {
    expect(ALL.filter(canAdminCancel)).toEqual(['PAID', 'PREPARING', 'READY_FOR_PICKUP']);
  });

  it('the customer can pay again or cancel only while pending', () => {
    expect(ALL.filter(canCustomerPayOrCancel)).toEqual(['PENDING_PAYMENT']);
  });
});

describe('admin action texts (written by hand: they are the button copy)', () => {
  it('each transition has its exact button text', () => {
    expect(ADMIN_TRANSITIONS.map((t) => [t.from, t.to, t.label])).toEqual([
      ['PAID', 'PREPARING', 'Empezar a preparar'],
      ['PREPARING', 'READY_FOR_PICKUP', 'Marcar como listo para retirar'],
      ['PREPARING', 'SHIPPED', 'Marcar como enviado'],
      ['READY_FOR_PICKUP', 'DELIVERED', 'Marcar como entregado'],
      ['SHIPPED', 'DELIVERED', 'Marcar como entregado'],
    ]);
  });
});

describe('status labels', () => {
  it('has a Spanish label for each of the 8 statuses', () => {
    expect(ORDER_STATUS_LABELS).toEqual({
      PENDING_PAYMENT: 'Pendiente de pago',
      PAID: 'Pagado',
      PREPARING: 'En preparación',
      READY_FOR_PICKUP: 'Listo para retirar',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
      EXPIRED: 'Vencido',
    });
  });
});
