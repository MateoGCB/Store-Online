import { z } from 'zod';
import type { Deps } from '../deps.js';
import { Prisma } from '../generated/prisma/client.js';
import type { AuthUser } from '../express.js';
import { AppError, badRequest, conflict, notFound } from '../lib/errors.js';
import { MAX_ORDER_TOTAL_CENTS } from '../lib/money.js';
import { availableUnits, orderDto, type OrderWithRelations } from './dto.js';
import { getSettingsRow } from './settings.service.js';
import { cancelPendingOrder } from './stock.service.js';

/** Unknown fields (e.g. prices sent by the client) are stripped and ignored on purpose. */
export const checkoutInput = z.object({
  fulfillment: z.enum(['PICKUP', 'DELIVERY']),
  addressId: z.uuid().optional(),
  notes: z.string().trim().max(300).optional(),
});

export const idempotencyKeySchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9_.:-]{8,100}$/,
    'El Idempotency-Key tiene que tener entre 8 y 100 caracteres.',
  );

export interface CheckoutResult {
  order: ReturnType<typeof orderDto>;
  paymentUrl: string | null;
  replayed: boolean;
}

const paymentsNotConfigured = () =>
  new AppError(
    503,
    'PAYMENTS_NOT_CONFIGURED',
    'Los pagos todavía no están configurados en esta tienda.',
  );

function checkoutUrlOf(order: OrderWithRelations): string | null {
  if (order.status !== 'PENDING_PAYMENT') return null;
  const latest = [...order.payments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  return latest?.checkoutUrl ?? null;
}

async function replay(deps: Deps, userId: string, key: string): Promise<CheckoutResult | null> {
  const existing = await deps.prisma.order.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: key } },
    include: { items: true, payments: true },
  });
  if (!existing) return null;
  return { order: orderDto(existing), paymentUrl: checkoutUrlOf(existing), replayed: true };
}

export async function checkout(
  deps: Deps,
  user: AuthUser,
  input: z.output<typeof checkoutInput>,
  idempotencyKey?: string,
): Promise<CheckoutResult> {
  const payments = deps.payments;
  if (!payments) throw paymentsNotConfigured();

  if (idempotencyKey) {
    const previous = await replay(deps, user.id, idempotencyKey);
    if (previous) return previous;
  }

  let order: OrderWithRelations;
  try {
    order = await createOrderReservingStock(deps, user, input, payments.name, idempotencyKey);
  } catch (err) {
    // Two simultaneous requests with the same key: the loser returns the winner's order.
    if (
      idempotencyKey &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const previous = await replay(deps, user.id, idempotencyKey);
      if (previous) return previous;
    }
    throw err;
  }

  // Outside the transaction: never hold row locks while calling an external API.
  let preference;
  try {
    preference = await payments.createPreference({
      orderId: order.id,
      orderNumber: order.number,
      payerEmail: user.email,
      expiresAt: order.expiresAt,
      notificationUrl: `${deps.env.PUBLIC_API_URL.replace(/\/+$/, '')}/api/v1/webhooks/mercadopago`,
      backUrls: {
        success: `${deps.env.FRONTEND_URL}/orders/${order.id}?payment=success`,
        pending: `${deps.env.FRONTEND_URL}/orders/${order.id}?payment=pending`,
        failure: `${deps.env.FRONTEND_URL}/orders/${order.id}?payment=failure`,
      },
      items: [
        ...order.items.map((i) => ({
          id: i.productId ?? i.id,
          title: i.nameSnapshot,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCentsSnapshot,
        })),
        ...(order.shippingCents > 0
          ? [{ id: 'shipping', title: 'Envío', quantity: 1, unitPriceCents: order.shippingCents }]
          : []),
      ],
    });
  } catch (err) {
    deps.logger.error({ err, orderId: order.id }, 'payment preference creation failed');
    await compensateFailedCheckout(deps, order);
    throw new AppError(
      502,
      'PAYMENT_PROVIDER_ERROR',
      'No pudimos iniciar el pago con Mercado Pago. No se reservó nada y tu carrito sigue igual: probá de nuevo en unos minutos.',
    );
  }

  const paymentRow = order.payments[0]!;
  await deps.prisma.payment.update({
    where: { id: paymentRow.id },
    data: { preferenceId: preference.preferenceId, checkoutUrl: preference.checkoutUrl },
  });
  const fresh = await deps.prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true, payments: true },
  });
  return { order: orderDto(fresh), paymentUrl: preference.checkoutUrl, replayed: false };
}

/** Undo a checkout whose payment could not be started: cancel, release stock, restore cart. */
async function compensateFailedCheckout(deps: Deps, order: OrderWithRelations) {
  const cancelled = await cancelPendingOrder(deps, order.id, 'PAYMENT_PROVIDER_ERROR');
  if (!cancelled) return;
  const cart = await deps.prisma.cart.upsert({
    where: { userId: order.userId },
    create: { userId: order.userId },
    update: {},
  });
  for (const item of order.items) {
    if (!item.productId) continue;
    await deps.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
      create: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
      update: {},
    });
  }
}

/**
 * One transaction: read the cart, validate, compute totals on the server, reserve stock
 * with an atomic conditional UPDATE per product, create the order + payment, empty the
 * cart. Any failure rolls everything back.
 */
async function createOrderReservingStock(
  deps: Deps,
  user: AuthUser,
  input: z.output<typeof checkoutInput>,
  provider: string,
  idempotencyKey: string | undefined,
): Promise<OrderWithRelations> {
  const now = deps.clock.now();
  return deps.prisma.$transaction(
    async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId: user.id },
        include: { items: { include: { product: true } } },
      });
      const lines = [...(cart?.items ?? [])].sort((a, b) => a.productId.localeCompare(b.productId));
      if (!cart || lines.length === 0) {
        throw conflict('CART_EMPTY', 'Tu carrito está vacío.');
      }

      let address = null;
      if (input.fulfillment === 'DELIVERY') {
        if (!input.addressId) {
          throw badRequest('ADDRESS_REQUIRED', 'Elegí una dirección para el envío.', [
            { field: 'addressId', message: 'Este campo es obligatorio para envíos.' },
          ]);
        }
        address = await tx.address.findFirst({ where: { id: input.addressId, userId: user.id } });
        if (!address) throw notFound('ADDRESS_NOT_FOUND', 'No encontramos esa dirección.');
      }

      const unavailable = lines.filter((l) => !l.product.active || l.product.archivedAt);
      if (unavailable.length) {
        throw conflict(
          'PRODUCT_UNAVAILABLE',
          'Algunos productos de tu carrito ya no están a la venta. Sacalos para continuar.',
          { products: unavailable.map((l) => ({ productId: l.productId, name: l.product.name })) },
        );
      }

      const settings = await getSettingsRow(tx);
      const subtotalCents = lines.reduce((s, l) => s + l.product.priceCents * l.quantity, 0);
      const shippingCents = input.fulfillment === 'DELIVERY' ? settings.shippingCostCents : 0;
      const totalCents = subtotalCents + shippingCents;
      if (totalCents > MAX_ORDER_TOTAL_CENTS) {
        throw conflict(
          'ORDER_TOTAL_TOO_HIGH',
          'El total del pedido supera el máximo permitido ($10.000.000).',
        );
      }

      // Reserve: succeeds only if enough units are available right now (atomic per row).
      const failed: typeof lines = [];
      for (const line of lines) {
        const updated = await tx.$executeRaw`
          UPDATE products
             SET reserved = reserved + ${line.quantity}, updated_at = ${now}
           WHERE id = ${line.productId}::uuid
             AND active = true
             AND archived_at IS NULL
             AND stock - reserved >= ${line.quantity}`;
        if (updated === 0) failed.push(line);
      }
      if (failed.length) {
        const current = await tx.product.findMany({
          where: { id: { in: failed.map((l) => l.productId) } },
        });
        throw conflict(
          'INSUFFICIENT_STOCK',
          'No hay stock suficiente para algunos productos de tu carrito.',
          {
            products: failed.map((l) => {
              const p = current.find((c) => c.id === l.productId);
              return {
                productId: l.productId,
                name: l.product.name,
                requested: l.quantity,
                available: p ? availableUnits(p) : 0,
              };
            }),
          },
        );
      }

      const order = await tx.order.create({
        data: {
          userId: user.id,
          fulfillment: input.fulfillment,
          subtotalCents,
          shippingCents,
          totalCents,
          notes: input.notes || null,
          expiresAt: new Date(now.getTime() + deps.env.RESERVATION_MINUTES * 60_000),
          idempotencyKey: idempotencyKey ?? null,
          createdAt: now,
          ...(address
            ? {
                shipFullName: address.fullName,
                shipPhone: address.phone,
                shipStreet: address.street,
                shipNumber: address.number,
                shipFloorApt: address.floorApt,
                shipCity: address.city,
                shipProvince: address.province,
                shipPostalCode: address.postalCode,
                shipNotes: address.notes,
              }
            : {}),
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              nameSnapshot: l.product.name,
              unitPriceCentsSnapshot: l.product.priceCents,
              quantity: l.quantity,
            })),
          },
          payments: { create: { provider, amountCents: totalCents, status: 'PENDING' } },
        },
        include: { items: true, payments: true },
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return order;
    },
    { maxWait: 15_000, timeout: 20_000 },
  );
}
