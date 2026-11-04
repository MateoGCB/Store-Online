import type { Tx } from '../db.js';
import type { Deps } from '../deps.js';

/**
 * Locks product rows in a fixed order (by id). Every transaction that touches several
 * products locks them in the same order, which prevents deadlocks between them.
 */
export async function lockProducts(tx: Tx, productIds: string[]): Promise<void> {
  const ids = [...new Set(productIds)].sort();
  if (ids.length === 0) return;
  await tx.$queryRaw`SELECT id FROM products WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
}

/**
 * Releases the units reserved by an order. Callers MUST first move the order out of
 * PENDING_PAYMENT with a conditional UPDATE, so this runs at most once per order.
 */
export async function releaseReservation(tx: Tx, orderId: string, now: Date): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } } });
  await lockProducts(
    tx,
    items.map((i) => i.productId!),
  );
  for (const item of items) {
    await tx.$executeRaw`
      UPDATE products SET reserved = reserved - ${item.quantity}, updated_at = ${now}
       WHERE id = ${item.productId}::uuid`;
  }
}

/**
 * Moves overdue PENDING_PAYMENT orders to EXPIRED and releases their reservations.
 * Safe to run concurrently (several instances, or the job plus a lazy call): the
 * conditional UPDATE ... RETURNING only hands each order to one caller.
 */
export async function expireOverdueOrders(deps: Deps): Promise<number> {
  const now = deps.clock.now();
  return deps.prisma.$transaction(async (tx) => {
    const expired = await tx.$queryRaw<{ id: string }[]>`
      UPDATE orders SET status = 'EXPIRED', updated_at = ${now}
       WHERE status = 'PENDING_PAYMENT' AND expires_at < ${now}
       RETURNING id`;
    for (const { id } of expired) {
      await releaseReservation(tx, id, now);
    }
    return expired.length;
  });
}

/**
 * Cancels a PENDING_PAYMENT order and releases its reservation.
 * Returns false (and changes nothing) if the order was no longer pending.
 */
export async function cancelPendingOrder(
  deps: Deps,
  orderId: string,
  reason: string,
): Promise<boolean> {
  const now = deps.clock.now();
  return deps.prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE orders
         SET status = 'CANCELLED', cancelled_at = ${now}, cancel_reason = ${reason}, updated_at = ${now}
       WHERE id = ${orderId}::uuid AND status = 'PENDING_PAYMENT'
       RETURNING id`;
    if (rows.length === 0) return false;
    await releaseReservation(tx, orderId, now);
    await tx.payment.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    return true;
  });
}
