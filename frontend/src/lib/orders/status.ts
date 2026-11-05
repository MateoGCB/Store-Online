import type { Fulfillment, OrderStatus, PaymentStatus } from '@/lib/api/types';
import type { Tone } from '@/lib/tone';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PREPARING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
];

/** The single source for status texts shown to people. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PAID: 'Pagado',
  PREPARING: 'En preparación',
  READY_FOR_PICKUP: 'Listo para retirar',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
};

/** Longer explanation for the customer. */
export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Estamos esperando la confirmación del pago.',
  PAID: 'Recibimos tu pago. En breve empezamos a preparar tu pedido.',
  PREPARING: 'Estamos preparando tu pedido.',
  READY_FOR_PICKUP: 'Tu pedido está listo. Podés pasar a retirarlo.',
  SHIPPED: 'Tu pedido está en camino.',
  DELIVERED: 'Tu pedido fue entregado. ¡Gracias por tu compra!',
  CANCELLED: 'El pedido fue cancelado.',
  EXPIRED: 'El pedido venció porque no se completó el pago a tiempo.',
};

export const ORDER_STATUS_TONES: Record<OrderStatus, Tone> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'info',
  PREPARING: 'info',
  READY_FOR_PICKUP: 'success',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  EXPIRED: 'neutral',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

export const FULFILLMENT_LABELS: Record<Fulfillment, string> = {
  PICKUP: 'Retiro en el local',
  DELIVERY: 'Envío a domicilio',
};

export interface Transition {
  from: OrderStatus;
  to: OrderStatus;
  /** null = valid for both pickup and delivery orders. */
  fulfillment: Fulfillment | null;
  /** Button text in the admin panel. */
  label: string;
}

/**
 * Valid admin transitions (mirrors the backend state machine). The admin UI and its
 * tests read this one table: a button is shown only if its transition is listed here.
 */
export const ADMIN_TRANSITIONS: readonly Transition[] = [
  { from: 'PAID', to: 'PREPARING', fulfillment: null, label: 'Empezar a preparar' },
  {
    from: 'PREPARING',
    to: 'READY_FOR_PICKUP',
    fulfillment: 'PICKUP',
    label: 'Marcar como listo para retirar',
  },
  { from: 'PREPARING', to: 'SHIPPED', fulfillment: 'DELIVERY', label: 'Marcar como enviado' },
  {
    from: 'READY_FOR_PICKUP',
    to: 'DELIVERED',
    fulfillment: 'PICKUP',
    label: 'Marcar como entregado',
  },
  { from: 'SHIPPED', to: 'DELIVERED', fulfillment: 'DELIVERY', label: 'Marcar como entregado' },
];

export function availableTransitions(status: OrderStatus, fulfillment: Fulfillment): Transition[] {
  return ADMIN_TRANSITIONS.filter(
    (t) => t.from === status && (t.fulfillment === null || t.fulfillment === fulfillment),
  );
}

/** Statuses from which the admin can cancel (with a mandatory reason). */
export const ADMIN_CANCELLABLE: readonly OrderStatus[] = ['PAID', 'PREPARING', 'READY_FOR_PICKUP'];

export function canAdminCancel(status: OrderStatus): boolean {
  return ADMIN_CANCELLABLE.includes(status);
}

/** The customer can pay again or cancel only while the order waits for payment. */
export function canCustomerPayOrCancel(status: OrderStatus): boolean {
  return status === 'PENDING_PAYMENT';
}
