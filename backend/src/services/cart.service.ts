import { z } from 'zod';
import type { Deps } from '../deps.js';
import { conflict, notFound } from '../lib/errors.js';
import { pluralize } from '../lib/plural.js';
import { visibleProduct } from './catalog.service.js';
import { MAX_CART_LINES, MAX_UNITS_PER_PRODUCT, availableUnits, imageDto } from './dto.js';

export const setCartItemInput = z
  .object({ quantity: z.number().int().min(1).max(MAX_UNITS_PER_PRODUCT) })
  .strict();

export type CartWarning = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';

const warningMessages: Record<CartWarning, string> = {
  UNAVAILABLE: 'Este producto ya no está a la venta.',
  OUT_OF_STOCK: 'Este producto se quedó sin stock.',
  INSUFFICIENT_STOCK: 'No hay stock suficiente para la cantidad elegida.',
};

async function ensureCart(deps: Deps, userId: string) {
  return deps.prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
}

/** Cart with current prices (carts never store prices) and per-line warnings. */
export async function getCart(deps: Deps, userId: string) {
  const cart = await deps.prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: { product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } } },
      },
    },
  });
  const items = (cart?.items ?? []).map((item) => {
    const p = item.product;
    const available = availableUnits(p);
    const sellable = p.active && !p.archivedAt;
    let warning: CartWarning | null = null;
    if (!sellable) warning = 'UNAVAILABLE';
    else if (available === 0) warning = 'OUT_OF_STOCK';
    else if (item.quantity > available) warning = 'INSUFFICIENT_STOCK';
    const firstImage = p.images[0];
    return {
      productId: p.id,
      name: p.name,
      slug: p.slug,
      image: firstImage ? imageDto(firstImage, deps.storage) : null,
      unitPriceCents: p.priceCents,
      quantity: item.quantity,
      lineTotalCents: p.priceCents * item.quantity,
      maxPurchasable: sellable ? Math.min(available, MAX_UNITS_PER_PRODUCT) : 0,
      warning,
      warningMessage: warning ? warningMessages[warning] : null,
    };
  });
  const purchasable = items.filter((i) => i.warning === null);
  return {
    items,
    subtotalCents: purchasable.reduce((sum, i) => sum + i.lineTotalCents, 0),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    canCheckout: items.length > 0 && purchasable.length === items.length,
  };
}

export async function setCartItem(deps: Deps, userId: string, productId: string, quantity: number) {
  const product = await deps.prisma.product.findFirst({
    where: { id: productId, ...visibleProduct },
  });
  if (!product) throw notFound('PRODUCT_NOT_FOUND', 'No encontramos ese producto.');
  const available = availableUnits(product);
  if (quantity > available) {
    throw conflict(
      'INSUFFICIENT_STOCK',
      available === 0
        ? 'Este producto no tiene stock disponible.'
        : `Solo hay ${pluralize(available, 'unidad disponible', 'unidades disponibles')}.`,
      { productId, available },
    );
  }
  const cart = await ensureCart(deps, userId);
  await deps.prisma.$transaction(async (tx) => {
    // Serialize changes to this cart so the line limit holds under concurrency.
    await tx.$executeRaw`SELECT 1 FROM carts WHERE id = ${cart.id}::uuid FOR UPDATE`;
    const existing = await tx.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (existing) {
      await tx.cartItem.update({ where: { id: existing.id }, data: { quantity } });
      return;
    }
    const lines = await tx.cartItem.count({ where: { cartId: cart.id } });
    if (lines >= MAX_CART_LINES) {
      throw conflict(
        'CART_LIMIT_REACHED',
        `El carrito puede tener como máximo ${MAX_CART_LINES} productos distintos.`,
      );
    }
    await tx.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
  });
  return getCart(deps, userId);
}

export async function removeCartItem(deps: Deps, userId: string, productId: string) {
  const cart = await deps.prisma.cart.findUnique({ where: { userId } });
  if (cart) await deps.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  return getCart(deps, userId);
}

export async function clearCart(deps: Deps, userId: string) {
  const cart = await deps.prisma.cart.findUnique({ where: { userId } });
  if (cart) await deps.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getCart(deps, userId);
}
