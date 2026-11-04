import { z } from 'zod';
import type { Deps } from '../deps.js';
import type { Fulfillment, OrderStatus, Prisma } from '../generated/prisma/client.js';
import { AppError, conflict, notFound } from '../lib/errors.js';
import { type Page, paginationQuery, toSkipTake } from '../lib/pagination.js';
import { trimmed } from '../lib/validation.js';
import { adminOrderDto, orderDto } from './dto.js';
import { processProviderPayment } from './payments.service.js';
import { cancelPendingOrder, expireOverdueOrders, lockProducts } from './stock.service.js';

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PREPARING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
] as const satisfies readonly OrderStatus[];

const orderNotFound = () => notFound('ORDER_NOT_FOUND', 'No encontramos ese pedido.');
const include = { items: true, payments: true } as const;

// ---------- Customer ----------

export async function listMyOrders(
  deps: Deps,
  userId: string,
  query: z.output<typeof paginationQuery>,
): Promise<Page<ReturnType<typeof orderDto>>> {
  await expireOverdueOrders(deps);
  const where = { userId };
  const [total, orders] = await deps.prisma.$transaction([
    deps.prisma.order.count({ where }),
    deps.prisma.order.findMany({
      where,
      include,
      orderBy: [{ createdAt: 'desc' }, { number: 'desc' }],
      ...toSkipTake(query),
    }),
  ]);
  return { items: orders.map(orderDto), page: query.page, pageSize: query.pageSize, total };
}

/** Owner check: another customer's order is reported as not found (404), never 403. */
async function findOwnOrder(deps: Deps, userId: string, orderId: string) {
  const order = await deps.prisma.order.findFirst({ where: { id: orderId, userId }, include });
  if (!order) throw orderNotFound();
  return order;
}

export async function getMyOrder(deps: Deps, userId: string, orderId: string) {
  await expireOverdueOrders(deps);
  return orderDto(await findOwnOrder(deps, userId, orderId));
}

export async function cancelMyOrder(deps: Deps, userId: string, orderId: string) {
  await findOwnOrder(deps, userId, orderId);
  await expireOverdueOrders(deps);
  const cancelled = await cancelPendingOrder(deps, orderId, 'CANCELLED_BY_CUSTOMER');
  if (!cancelled) {
    throw conflict(
      'ORDER_NOT_CANCELLABLE',
      'Solo podés cancelar pedidos que están pendientes de pago.',
    );
  }
  return orderDto(await findOwnOrder(deps, userId, orderId));
}

/** Returns the checkout URL of a pending, non-expired order (reusing its preference). */
export async function payMyOrder(deps: Deps, userId: string, orderId: string) {
  await findOwnOrder(deps, userId, orderId);
  await expireOverdueOrders(deps);
  const order = await findOwnOrder(deps, userId, orderId);
  if (order.status !== 'PENDING_PAYMENT') {
    throw conflict('ORDER_NOT_PAYABLE', 'Este pedido ya no se puede pagar.', {
      status: order.status,
    });
  }
  const payment = [...order.payments]
    .filter((p) => p.checkoutUrl)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (!payment?.checkoutUrl) {
    throw new AppError(
      502,
      'PAYMENT_PROVIDER_ERROR',
      'No encontramos el link de pago de este pedido. Probá de nuevo en unos minutos.',
    );
  }
  return { order: orderDto(order), paymentUrl: payment.checkoutUrl };
}

/**
 * Asks the provider for the real state of the order's payments (useful when the buyer
 * comes back from Mercado Pago before the webhook arrives, or locally without a tunnel).
 */
export async function syncMyOrder(deps: Deps, userId: string, orderId: string) {
  await findOwnOrder(deps, userId, orderId);
  if (!deps.payments) {
    throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Los pagos no están configurados.');
  }
  await expireOverdueOrders(deps);
  let payments;
  try {
    payments = await deps.payments.findPaymentsByExternalReference(orderId);
  } catch (err) {
    deps.logger.error({ err, orderId }, 'payment sync failed');
    throw new AppError(
      502,
      'PAYMENT_PROVIDER_ERROR',
      'No pudimos consultar el estado del pago. Probá de nuevo en unos minutos.',
    );
  }
  for (const payment of payments) {
    if (payment.externalReference === orderId) await processProviderPayment(deps, payment);
  }
  return orderDto(await findOwnOrder(deps, userId, orderId));
}

// ---------- Admin ----------

export const adminOrdersQuery = paginationQuery.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  number: z.coerce.number().int().min(1).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  needsAttention: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const changeStatusInput = z
  .object({
    status: z.enum(ORDER_STATUSES),
    /** Optional optimistic check: the status the admin saw on screen. */
    fromStatus: z.enum(ORDER_STATUSES).optional(),
  })
  .strict();

export const adminCancelInput = z.object({ reason: trimmed(1, 300) }).strict();

/** Allowed forward transitions (cancellation has its own endpoint and rules). */
export const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: [],
  PAID: ['PREPARING'],
  PREPARING: ['READY_FOR_PICKUP', 'SHIPPED'],
  READY_FOR_PICKUP: ['DELIVERED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const ADMIN_CANCELLABLE: readonly OrderStatus[] = ['PAID', 'PREPARING', 'READY_FOR_PICKUP'];

export function canTransition(from: OrderStatus, to: OrderStatus, fulfillment: Fulfillment) {
  if (!TRANSITIONS[from].includes(to)) return false;
  // Pickup orders never go through SHIPPED and delivery orders never through READY_FOR_PICKUP.
  const pickupOnly = to === 'READY_FOR_PICKUP' || from === 'READY_FOR_PICKUP';
  const deliveryOnly = to === 'SHIPPED' || from === 'SHIPPED';
  if (pickupOnly && fulfillment !== 'PICKUP') return false;
  if (deliveryOnly && fulfillment !== 'DELIVERY') return false;
  return true;
}

const statusChanged = () =>
  conflict(
    'ORDER_STATUS_CHANGED',
    'El estado del pedido cambió mientras lo editabas. Recargá y probá de nuevo.',
  );

const adminInclude = { ...include, user: { select: { id: true, email: true, name: true } } };

async function findAdminOrder(deps: Deps, orderId: string) {
  const order = await deps.prisma.order.findUnique({
    where: { id: orderId },
    include: adminInclude,
  });
  if (!order) throw orderNotFound();
  return order;
}

export async function listAdminOrders(deps: Deps, query: z.output<typeof adminOrdersQuery>) {
  await expireOverdueOrders(deps);
  const where: Prisma.OrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.number ? { number: query.number } : {}),
    ...(query.needsAttention !== undefined ? { needsAttention: query.needsAttention } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        }
      : {}),
  };
  const [total, orders] = await deps.prisma.$transaction([
    deps.prisma.order.count({ where }),
    deps.prisma.order.findMany({
      where,
      include: adminInclude,
      orderBy: [{ createdAt: 'desc' }, { number: 'desc' }],
      ...toSkipTake(query),
    }),
  ]);
  return { items: orders.map(adminOrderDto), page: query.page, pageSize: query.pageSize, total };
}

export async function getAdminOrder(deps: Deps, orderId: string) {
  await expireOverdueOrders(deps);
  return adminOrderDto(await findAdminOrder(deps, orderId));
}

export async function changeOrderStatus(
  deps: Deps,
  orderId: string,
  input: z.output<typeof changeStatusInput>,
) {
  const order = await findAdminOrder(deps, orderId);
  if (input.fromStatus && input.fromStatus !== order.status) throw statusChanged();
  if (!canTransition(order.status, input.status, order.fulfillment)) {
    throw conflict(
      'INVALID_STATUS_TRANSITION',
      `No se puede pasar un pedido de ${order.status} a ${input.status}.`,
      { from: order.status, to: input.status, fulfillment: order.fulfillment },
    );
  }
  const now = deps.clock.now();
  // Conditional on the status we read: if someone changed it in between, nothing happens.
  const result = await deps.prisma.order.updateMany({
    where: { id: orderId, status: order.status },
    data: { status: input.status, updatedAt: now },
  });
  if (result.count === 0) throw statusChanged();
  return adminOrderDto(await findAdminOrder(deps, orderId));
}

/** Cancels a paid order: units go back to stock and the order is flagged for a manual refund. */
export async function cancelPaidOrder(
  deps: Deps,
  orderId: string,
  actorId: string,
  input: z.output<typeof adminCancelInput>,
) {
  const order = await findAdminOrder(deps, orderId);
  if (!ADMIN_CANCELLABLE.includes(order.status)) {
    throw conflict(
      'ORDER_NOT_CANCELLABLE',
      'Solo se pueden cancelar pedidos pagados, en preparación o listos para retirar.',
      { status: order.status },
    );
  }
  const now = deps.clock.now();
  await deps.prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelReason: input.reason,
        needsAttention: true,
        attentionNote: 'Pedido pagado cancelado: hay que reembolsar el pago manualmente.',
        updatedAt: now,
      },
    });
    if (updated.count === 0) throw statusChanged();
    const items = order.items.filter((i) => i.productId);
    await lockProducts(
      tx,
      items.map((i) => i.productId!),
    );
    for (const item of items) {
      await tx.$executeRaw`
        UPDATE products SET stock = stock + ${item.quantity}, updated_at = ${now}
         WHERE id = ${item.productId}::uuid`;
      await tx.stockMovement.create({
        data: {
          productId: item.productId!,
          delta: item.quantity,
          reason: 'CANCEL_RESTOCK',
          orderId,
          actorId,
          note: input.reason,
        },
      });
    }
  });
  return adminOrderDto(await findAdminOrder(deps, orderId));
}

/** Clears the needs-attention flag once the admin has handled it (e.g. refunded by hand). */
export async function resolveAttention(deps: Deps, orderId: string) {
  await findAdminOrder(deps, orderId);
  await deps.prisma.order.update({
    where: { id: orderId },
    data: { needsAttention: false, updatedAt: deps.clock.now() },
  });
  return adminOrderDto(await findAdminOrder(deps, orderId));
}
