import type { Tx } from '../db.js';
import type { Deps } from '../deps.js';
import { Prisma, type PaymentStatus } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { CURRENCY, amountToCents } from '../lib/money.js';
import type { ProviderPayment, ProviderPaymentStatus } from '../payments/payment-provider.js';
import { lockProducts } from './stock.service.js';

export type PaymentOutcome =
  | 'duplicate_event'
  | 'payment_not_found'
  | 'order_not_found'
  | 'already_processed'
  | 'paid'
  | 'late_paid'
  | 'needs_attention'
  | 'recorded';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toPaymentStatus(status: ProviderPaymentStatus): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'cancelled':
      return 'CANCELLED';
    case 'refunded':
    case 'charged_back':
      return 'REFUNDED';
    default:
      return 'PENDING';
  }
}

class DuplicateEvent extends Error {}

/**
 * Handles a (signature-verified) Mercado Pago notification. The body is never trusted:
 * the payment is fetched from the provider API using only its id.
 */
export async function handlePaymentNotification(
  deps: Deps,
  eventId: string,
  paymentId: string,
): Promise<PaymentOutcome> {
  const payments = deps.payments;
  if (!payments) {
    throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Los pagos no están configurados.');
  }
  const seen = await deps.prisma.webhookEvent.findUnique({
    where: { provider_eventId: { provider: payments.name, eventId } },
  });
  if (seen) return 'duplicate_event';

  const payment = await payments.getPayment(paymentId);
  if (!payment) {
    deps.logger.warn({ paymentId }, 'webhook for a payment the provider does not know');
    return 'payment_not_found';
  }
  return processProviderPayment(deps, payment, eventId);
}

/**
 * Applies a payment read from the provider to our order. All changes for an order are
 * serialized by locking the order row first, so webhooks, `sync` and the expiry job can
 * race safely. When `eventId` is given it is recorded in the same transaction (idempotency).
 */
export async function processProviderPayment(
  deps: Deps,
  payment: ProviderPayment,
  eventId?: string,
): Promise<PaymentOutcome> {
  const provider = deps.payments?.name ?? 'mercadopago';
  const orderId = payment.externalReference;
  try {
    return await deps.prisma.$transaction(
      async (tx) => {
        if (eventId) {
          try {
            await tx.webhookEvent.create({ data: { provider, eventId } });
          } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
              throw new DuplicateEvent();
            }
            throw err;
          }
        }
        if (!orderId || !UUID.test(orderId)) return 'order_not_found';
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
        if (locked.length === 0) return 'order_not_found';
        return applyPayment(deps, tx, orderId, payment, provider);
      },
      { maxWait: 15_000, timeout: 20_000 },
    );
  } catch (err) {
    if (err instanceof DuplicateEvent) return 'duplicate_event';
    throw err;
  }
}

async function flagAttention(tx: Tx, orderId: string, note: string, now: Date) {
  await tx.order.update({
    where: { id: orderId },
    data: { needsAttention: true, attentionNote: note, updatedAt: now },
  });
}

async function applyPayment(
  deps: Deps,
  tx: Tx,
  orderId: string,
  payment: ProviderPayment,
  provider: string,
): Promise<PaymentOutcome> {
  const now = deps.clock.now();
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });
  const status = toPaymentStatus(payment.status);
  const amountCents = amountToCents(payment.amount);

  // Record the payment (one row per provider payment id).
  const existing = await tx.payment.findUnique({ where: { providerPaymentId: payment.id } });
  const previousStatus = existing?.status;
  if (existing) {
    await tx.payment.update({ where: { id: existing.id }, data: { status } });
  } else {
    const placeholder = await tx.payment.findFirst({
      where: { orderId, providerPaymentId: null },
      orderBy: { createdAt: 'desc' },
    });
    if (placeholder) {
      await tx.payment.update({
        where: { id: placeholder.id },
        data: { providerPaymentId: payment.id, status },
      });
    } else {
      await tx.payment.create({
        data: {
          orderId,
          provider,
          providerPaymentId: payment.id,
          status,
          amountCents: amountCents ?? 0,
        },
      });
    }
  }

  if (status === 'REFUNDED' && previousStatus !== 'REFUNDED' && order.paidAt) {
    await flagAttention(
      tx,
      orderId,
      'Mercado Pago informó un reembolso o contracargo de este pedido.',
      now,
    );
    return 'needs_attention';
  }
  if (status !== 'APPROVED') return 'recorded';
  if (previousStatus === 'APPROVED') return 'already_processed';

  if (payment.currency !== CURRENCY || amountCents !== order.totalCents) {
    await flagAttention(
      tx,
      orderId,
      `Pago aprobado con monto o moneda distintos al pedido (${payment.amount} ${payment.currency}). Revisar y reembolsar.`,
      now,
    );
    return 'needs_attention';
  }

  if (order.status === 'PENDING_PAYMENT') {
    const updated = await tx.$executeRaw`
      UPDATE orders SET status = 'PAID', paid_at = ${now}, updated_at = ${now}
       WHERE id = ${orderId}::uuid AND status = 'PENDING_PAYMENT'`;
    if (updated === 1) {
      await lockProducts(
        tx,
        order.items.flatMap((i) => (i.productId ? [i.productId] : [])),
      );
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.$executeRaw`
          UPDATE products
             SET stock = stock - ${item.quantity}, reserved = reserved - ${item.quantity}, updated_at = ${now}
           WHERE id = ${item.productId}::uuid`;
        await tx.stockMovement.create({
          data: { productId: item.productId, delta: -item.quantity, reason: 'SALE', orderId },
        });
      }
      return 'paid';
    }
  }

  if (order.paidAt) {
    await flagAttention(
      tx,
      orderId,
      'Se recibió otro pago aprobado para un pedido que ya estaba pagado. Revisar y reembolsar.',
      now,
    );
    return 'needs_attention';
  }

  if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
    return applyLatePayment(tx, order, now);
  }
  return 'recorded';
}

/**
 * Approved payment for an order that already expired or was cancelled (its reservation
 * was released). Take the units again if they are available; otherwise flag the order
 * for a manual refund and leave it as it is.
 */
async function applyLatePayment(
  tx: Tx,
  order: Prisma.OrderGetPayload<{ include: { items: true } }>,
  now: Date,
): Promise<PaymentOutcome> {
  const items = order.items.filter((i) => i.productId);
  await lockProducts(
    tx,
    items.map((i) => i.productId!),
  );
  const products = await tx.product.findMany({
    where: { id: { in: items.map((i) => i.productId!) } },
  });
  const enough =
    items.length === order.items.length &&
    items.every((i) => {
      const p = products.find((x) => x.id === i.productId);
      return p !== undefined && p.stock - p.reserved >= i.quantity;
    });

  if (!enough) {
    await flagAttention(
      tx,
      order.id,
      'Pago aprobado después de que el pedido venció o se canceló, y ya no hay stock. Reembolsar manualmente.',
      now,
    );
    return 'needs_attention';
  }

  const updated = await tx.$executeRaw`
    UPDATE orders
       SET status = 'PAID', paid_at = ${now}, cancelled_at = NULL, cancel_reason = NULL, updated_at = ${now}
     WHERE id = ${order.id}::uuid AND status IN ('EXPIRED', 'CANCELLED')`;
  if (updated !== 1) return 'recorded';
  for (const item of items) {
    await tx.$executeRaw`
      UPDATE products SET stock = stock - ${item.quantity}, updated_at = ${now}
       WHERE id = ${item.productId}::uuid`;
    await tx.stockMovement.create({
      data: {
        productId: item.productId!,
        delta: -item.quantity,
        reason: 'LATE_PAYMENT',
        orderId: order.id,
      },
    });
  }
  return 'late_paid';
}
