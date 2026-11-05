import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Deps } from '../deps.js';
import { AppError, notFound } from '../lib/errors.js';
import { CURRENCY, centsToAmount } from '../lib/money.js';
import { FakePaymentProvider } from '../payments/fake.provider.js';
import { getMyOrder } from './orders.service.js';
import { handlePaymentNotification } from './payments.service.js';

export const simulatePaymentInput = z
  .object({ outcome: z.enum(['approved', 'rejected']) })
  .strict();

/**
 * Demo mode only (PAYMENTS_PROVIDER=fake): records a simulated payment for the buyer's own
 * order and runs it through the SAME confirmation path as a real Mercado Pago webhook
 * (payment read back from the provider, amount check, idempotency, late payments...).
 */
export async function simulatePayment(
  deps: Deps,
  userId: string,
  orderId: string,
  outcome: z.output<typeof simulatePaymentInput>['outcome'],
) {
  const provider = deps.payments;
  if (deps.env.PAYMENTS_PROVIDER !== 'fake' || !(provider instanceof FakePaymentProvider)) {
    throw new AppError(404, 'ROUTE_NOT_FOUND', 'La ruta solicitada no existe.');
  }
  const order = await deps.prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw notFound('ORDER_NOT_FOUND', 'No encontramos ese pedido.');

  const paymentId = `sim-${randomUUID()}`;
  provider.addPayment({
    id: paymentId,
    status: outcome,
    externalReference: order.id,
    amount: centsToAmount(order.totalCents),
    currency: CURRENCY,
  });
  await handlePaymentNotification(deps, `simulated:${paymentId}`, paymentId);
  return getMyOrder(deps, userId, orderId);
}
