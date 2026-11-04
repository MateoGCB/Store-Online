/**
 * Response mappers (allow-lists). Routes never return Prisma objects directly, so new
 * columns (or sensitive ones like passwordHash, stock, reserved) never leak by accident.
 */
import type {
  Address,
  Category,
  Order,
  OrderItem,
  Payment,
  Product,
  ProductImage,
  StoreSettings,
  User,
} from '../generated/prisma/client.js';
import type { StorageProvider } from '../storage/storage-provider.js';

export const MAX_UNITS_PER_PRODUCT = 20;
export const MAX_CART_LINES = 30;

export function userDto(user: Pick<User, 'id' | 'email' | 'name' | 'role'>) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export function categoryDto(category: Pick<Category, 'id' | 'name' | 'slug'>) {
  return { id: category.id, name: category.name, slug: category.slug };
}

export function imageDto(image: ProductImage, storage: StorageProvider) {
  return {
    id: image.id,
    url: storage.publicUrl(image.storageKey),
    alt: image.alt,
    position: image.position,
  };
}

export type ProductWithRelations = Product & { images: ProductImage[]; category: Category };

export function availableUnits(product: Pick<Product, 'stock' | 'reserved'>): number {
  return Math.max(0, product.stock - product.reserved);
}

/** Public product: never exposes stock or reserved, only whether it can be bought. */
export function publicProductDto(product: ProductWithRelations, storage: StorageProvider) {
  const available = availableUnits(product);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceCents: product.priceCents,
    images: [...product.images]
      .sort((a, b) => a.position - b.position)
      .map((i) => imageDto(i, storage)),
    category: categoryDto(product.category),
    inStock: available > 0,
    maxPurchasable: Math.min(available, MAX_UNITS_PER_PRODUCT),
  };
}

export function adminProductDto(product: ProductWithRelations, storage: StorageProvider) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceCents: product.priceCents,
    stock: product.stock,
    reserved: product.reserved,
    available: availableUnits(product),
    active: product.active,
    archivedAt: product.archivedAt?.toISOString() ?? null,
    category: categoryDto(product.category),
    images: [...product.images]
      .sort((a, b) => a.position - b.position)
      .map((i) => imageDto(i, storage)),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function addressDto(a: Address) {
  return {
    id: a.id,
    fullName: a.fullName,
    phone: a.phone,
    street: a.street,
    number: a.number,
    floorApt: a.floorApt,
    city: a.city,
    province: a.province,
    postalCode: a.postalCode,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
  };
}

export function settingsDto(s: StoreSettings) {
  return {
    storeName: s.storeName,
    shippingCostCents: s.shippingCostCents,
    pickupAddress: s.pickupAddress,
  };
}

export type OrderWithRelations = Order & { items: OrderItem[]; payments: Payment[] };

function shippingAddress(o: Order) {
  if (o.fulfillment !== 'DELIVERY') return null;
  return {
    fullName: o.shipFullName,
    phone: o.shipPhone,
    street: o.shipStreet,
    number: o.shipNumber,
    floorApt: o.shipFloorApt,
    city: o.shipCity,
    province: o.shipProvince,
    postalCode: o.shipPostalCode,
    notes: o.shipNotes,
  };
}

function latestPayment(payments: Payment[]): Payment | undefined {
  return [...payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export function orderDto(o: OrderWithRelations) {
  const payment = latestPayment(o.payments);
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    fulfillment: o.fulfillment,
    subtotalCents: o.subtotalCents,
    shippingCents: o.shippingCents,
    totalCents: o.totalCents,
    shippingAddress: shippingAddress(o),
    notes: o.notes,
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.nameSnapshot,
      unitPriceCents: i.unitPriceCentsSnapshot,
      quantity: i.quantity,
      lineTotalCents: i.unitPriceCentsSnapshot * i.quantity,
    })),
    payment: payment ? { status: payment.status } : null,
    expiresAt: o.expiresAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt.toISOString(),
  };
}

export function adminOrderDto(
  o: OrderWithRelations & { user: Pick<User, 'id' | 'email' | 'name'> },
) {
  return {
    ...orderDto(o),
    needsAttention: o.needsAttention,
    attentionNote: o.attentionNote,
    customer: { id: o.user.id, email: o.user.email, name: o.user.name },
    payments: o.payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      providerPaymentId: p.providerPaymentId,
      status: p.status,
      amountCents: p.amountCents,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}
