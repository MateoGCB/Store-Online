import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/** Response shapes for the docs (the DTO mappers in services/dto.ts produce them). */

const uuid = z.uuid().openapi({ example: '3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10' });
const isoDate = z.iso.datetime().openapi({ example: '2026-11-04T18:30:00.000Z' });
const cents = (example: number) =>
  z.number().int().openapi({ description: 'Pesos argentinos en centavos (entero).', example });

export const ErrorResponse = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string().openapi({ example: 'Revisá los datos enviados.' }),
      details: z
        .unknown()
        .optional()
        .openapi({
          example: [{ field: 'email', message: 'Ingresá un email válido.' }],
        }),
    }),
  })
  .openapi('Error');

export const User = z
  .object({
    id: uuid,
    email: z.email().openapi({ example: 'cliente@example.com' }),
    name: z.string().openapi({ example: 'Ana Pérez' }),
    role: z.enum(['CUSTOMER', 'ADMIN']),
  })
  .openapi('User');
export const UserResponse = z.object({ user: User }).openapi('UserResponse');

export const Category = z
  .object({
    id: uuid,
    name: z.string().openapi({ example: 'Cocina' }),
    slug: z.string().openapi({ example: 'cocina' }),
  })
  .openapi('Category');
export const CategoryList = z.object({ items: z.array(Category) }).openapi('CategoryList');
export const AdminCategoryList = z
  .object({ items: z.array(Category.extend({ productCount: z.number().int() })) })
  .openapi('AdminCategoryList');

export const Image = z
  .object({
    id: uuid,
    url: z.url().openapi({ example: 'http://localhost:4000/uploads/products/9a7c.webp' }),
    alt: z.string(),
    position: z.number().int(),
  })
  .openapi('Image');
export const ImageList = z.object({ items: z.array(Image) }).openapi('ImageList');

export const PublicProduct = z
  .object({
    id: uuid,
    name: z.string().openapi({ example: 'Taza de cerámica' }),
    slug: z.string().openapi({ example: 'taza-de-ceramica' }),
    description: z.string(),
    priceCents: cents(450000),
    images: z.array(Image),
    category: Category,
    inStock: z.boolean(),
    maxPurchasable: z
      .number()
      .int()
      .openapi({ description: 'Mínimo entre las unidades disponibles y 20.', example: 7 }),
  })
  .openapi('PublicProduct');

const page = <T extends z.ZodType>(item: T, name: string) =>
  z
    .object({
      items: z.array(item),
      page: z.number().int().openapi({ example: 1 }),
      pageSize: z.number().int().openapi({ example: 12 }),
      total: z.number().int().openapi({ example: 20 }),
    })
    .openapi(name);

export const PublicProductPage = page(PublicProduct, 'PublicProductPage');

export const AdminProduct = PublicProduct.omit({ inStock: true, maxPurchasable: true })
  .extend({
    stock: z.number().int().openapi({ example: 10 }),
    reserved: z.number().int().openapi({ example: 2 }),
    available: z.number().int().openapi({ example: 8 }),
    active: z.boolean(),
    archivedAt: isoDate.nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi('AdminProduct');
export const AdminProductPage = page(AdminProduct, 'AdminProductPage');

export const StockMovementList = z
  .object({
    items: z.array(
      z.object({
        id: uuid,
        delta: z.number().int().openapi({ example: -2 }),
        reason: z.enum(['INITIAL', 'SALE', 'ADMIN_ADJUSTMENT', 'CANCEL_RESTOCK', 'LATE_PAYMENT']),
        note: z.string().nullable(),
        orderId: uuid.nullable(),
        actorId: uuid.nullable(),
        createdAt: isoDate,
      }),
    ),
  })
  .openapi('StockMovementList');

export const StoreSettings = z
  .object({
    storeName: z.string().openapi({ example: 'Mi tienda' }),
    shippingCostCents: cents(350000),
    pickupAddress: z.string().openapi({ example: 'Av. Siempreviva 742, CABA' }),
  })
  .openapi('StoreSettings');

export const Cart = z
  .object({
    items: z.array(
      z.object({
        productId: uuid,
        name: z.string(),
        slug: z.string(),
        image: Image.nullable(),
        unitPriceCents: cents(450000),
        quantity: z.number().int().openapi({ example: 2 }),
        lineTotalCents: cents(900000),
        maxPurchasable: z.number().int(),
        warning: z.enum(['UNAVAILABLE', 'OUT_OF_STOCK', 'INSUFFICIENT_STOCK']).nullable(),
        warningMessage: z.string().nullable(),
      }),
    ),
    subtotalCents: cents(900000),
    itemCount: z.number().int(),
    canCheckout: z.boolean(),
  })
  .openapi('Cart');

export const Address = z
  .object({
    id: uuid,
    fullName: z.string().openapi({ example: 'Ana Pérez' }),
    phone: z.string().openapi({ example: '+54 11 5555-1234' }),
    street: z.string().openapi({ example: 'Av. Corrientes' }),
    number: z.string().openapi({ example: '1234' }),
    floorApt: z.string().nullable().openapi({ example: '5° B' }),
    city: z.string().openapi({ example: 'CABA' }),
    province: z.string().openapi({ example: 'Buenos Aires' }),
    postalCode: z.string().openapi({ example: 'C1043' }),
    notes: z.string().nullable(),
    createdAt: isoDate,
  })
  .openapi('Address');
export const AddressList = z.object({ items: z.array(Address) }).openapi('AddressList');

const orderStatus = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'PREPARING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
]);

export const Order = z
  .object({
    id: uuid,
    number: z.number().int().openapi({ example: 1042 }),
    status: orderStatus,
    fulfillment: z.enum(['PICKUP', 'DELIVERY']),
    subtotalCents: cents(900000),
    shippingCents: cents(350000),
    totalCents: cents(1250000),
    shippingAddress: Address.omit({ id: true, createdAt: true }).nullable(),
    notes: z.string().nullable(),
    items: z.array(
      z.object({
        productId: uuid.nullable(),
        name: z.string(),
        unitPriceCents: cents(450000),
        quantity: z.number().int(),
        lineTotalCents: cents(900000),
      }),
    ),
    payment: z
      .object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED']) })
      .nullable(),
    expiresAt: isoDate,
    paidAt: isoDate.nullable(),
    cancelledAt: isoDate.nullable(),
    cancelReason: z.string().nullable(),
    createdAt: isoDate,
  })
  .openapi('Order');
export const OrderPage = page(Order, 'OrderPage');

export const AdminOrder = Order.extend({
  needsAttention: z.boolean(),
  attentionNote: z.string().nullable(),
  customer: z.object({ id: uuid, email: z.email(), name: z.string() }),
  payments: z.array(
    z.object({
      id: uuid,
      provider: z.string().openapi({ example: 'mercadopago' }),
      providerPaymentId: z.string().nullable().openapi({ example: '1234567890' }),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED']),
      amountCents: cents(1250000),
      createdAt: isoDate,
      updatedAt: isoDate,
    }),
  ),
}).openapi('AdminOrder');
export const AdminOrderPage = page(AdminOrder, 'AdminOrderPage');

export const PaymentLink = z
  .object({
    order: Order,
    paymentUrl: z
      .url()
      .nullable()
      .openapi({ example: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123' }),
  })
  .openapi('PaymentLink');

export const Stats = z
  .object({
    ordersByStatus: z.record(orderStatus, z.number().int()),
    ordersNeedingAttention: z.number().int(),
    last30Days: z.object({
      from: isoDate,
      to: isoDate,
      paidOrders: z.number().int(),
      salesCents: cents(15300000),
    }),
    lowStockThreshold: z.number().int().openapi({ example: 5 }),
    lowStockProducts: z.array(
      z.object({
        id: uuid,
        name: z.string(),
        slug: z.string(),
        stock: z.number().int(),
        reserved: z.number().int(),
        active: z.boolean(),
      }),
    ),
  })
  .openapi('Stats');

export const Health = z
  .object({ status: z.string().openapi({ example: 'ok' }), database: z.string(), time: isoDate })
  .openapi('Health');

export const DevStatus = z
  .object({ paymentsProvider: z.enum(['mercadopago', 'fake']).openapi({ example: 'fake' }) })
  .openapi('DevStatus');

export const WebhookAck = z.object({ received: z.boolean() }).openapi('WebhookAck');

export { z };
