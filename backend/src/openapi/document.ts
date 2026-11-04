import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import type { Env } from '../config/env.js';
import { paginationQuery } from '../lib/pagination.js';
import { uuidParam } from '../lib/validation.js';
import { createAddressInput, updateAddressInput } from '../services/addresses.service.js';
import {
  adminProductsQuery,
  categoryInput,
  createProductInput,
  stockAdjustmentInput,
  updateProductInput,
} from '../services/admin-catalog.service.js';
import { loginSchema, registerSchema } from '../services/auth.service.js';
import { setCartItemInput } from '../services/cart.service.js';
import { listProductsQuery } from '../services/catalog.service.js';
import { checkoutInput } from '../services/checkout.service.js';
import { reorderImagesInput } from '../services/images.service.js';
import {
  adminCancelInput,
  adminOrdersQuery,
  changeStatusInput,
} from '../services/orders.service.js';
import { updateSettingsSchema } from '../services/settings.service.js';
import * as S from './schemas.js';

const { z } = S;
const API = '/api/v1';

type Access = 'public' | 'customer' | 'admin' | 'webhook';
type ErrorSpec = [status: number, code: string, message: string];

interface Operation {
  method: RouteConfig['method'];
  path: string;
  tag: string;
  summary: string;
  description?: string;
  access: Access;
  params?: RouteConfig['request'] extends infer R
    ? R extends { params?: infer P }
      ? P
      : never
    : never;
  query?: RouteConfig['request'] extends infer R
    ? R extends { query?: infer Q }
      ? Q
      : never
    : never;
  headers?: RouteConfig['request'] extends infer R
    ? R extends { headers?: infer H }
      ? H
      : never
    : never;
  body?: S.z.ZodType;
  multipart?: boolean;
  success: { status: number; description: string; schema?: S.z.ZodType };
  errors?: ErrorSpec[];
  rateLimited?: boolean;
}

const UNSAFE = new Set(['post', 'put', 'patch', 'delete']);

function errorContent(errors: ErrorSpec[]) {
  const examples = Object.fromEntries(
    errors.map(([, code, message]) => [code, { value: { error: { code, message } } }]),
  );
  return { 'application/json': { schema: S.ErrorResponse, examples } };
}

function buildResponses(op: Operation): RouteConfig['responses'] {
  const errors: ErrorSpec[] = [...(op.errors ?? [])];
  if (op.params || op.query || op.body) {
    errors.push([400, 'VALIDATION_ERROR', 'Revisá los datos enviados.']);
  }
  if (op.body)
    errors.push([400, 'INVALID_JSON', 'El cuerpo de la solicitud no es un JSON válido.']);
  if (op.access === 'customer' || op.access === 'admin') {
    errors.push([401, 'UNAUTHENTICATED', 'Tenés que iniciar sesión para continuar.']);
  }
  if (op.access === 'admin') errors.push([403, 'FORBIDDEN', 'No tenés permiso para hacer esto.']);
  if (UNSAFE.has(op.method) && op.access !== 'webhook') {
    errors.push([403, 'ORIGIN_NOT_ALLOWED', 'El origen de la solicitud no está permitido.']);
    errors.push([415, 'UNSUPPORTED_MEDIA_TYPE', 'El Content-Type tiene que ser application/json.']);
  }
  if (op.body)
    errors.push([413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la solicitud es demasiado grande.']);
  if (op.rateLimited) {
    errors.push([
      429,
      'RATE_LIMITED',
      'Hiciste demasiados intentos. Esperá un rato y probá de nuevo.',
    ]);
  }
  errors.push([500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado. Probá de nuevo más tarde.']);

  const byStatus = new Map<number, ErrorSpec[]>();
  for (const e of errors) byStatus.set(e[0], [...(byStatus.get(e[0]) ?? []), e]);

  const responses: RouteConfig['responses'] = {
    [op.success.status]: {
      description: op.success.description,
      ...(op.success.schema
        ? { content: { 'application/json': { schema: op.success.schema } } }
        : {}),
    },
  };
  for (const [status, list] of [...byStatus.entries()].sort((a, b) => a[0] - b[0])) {
    responses[status] = {
      description: list.map((e) => e[1]).join(', '),
      content: errorContent(list),
    };
  }
  return responses;
}

const idempotencyHeader = z.object({
  'idempotency-key': z.string().optional().openapi({
    description:
      'Clave opcional (8 a 100 caracteres). Repetir la misma clave devuelve el mismo pedido sin duplicarlo.',
    example: 'c0ffee00-checkout-1',
  }),
});

const productIdParam = z.object({ productId: z.uuid() });
const slugParam = z.object({ slug: z.string().openapi({ example: 'taza-de-ceramica' }) });
const imageParams = z.object({ id: z.uuid(), imageId: z.uuid() });
const webhookQuery = z.object({
  'data.id': z.string().openapi({ example: '1234567890' }),
  type: z.string().openapi({ example: 'payment' }),
});
const notFoundProduct: ErrorSpec = [404, 'PRODUCT_NOT_FOUND', 'No encontramos ese producto.'];
const notFoundOrder: ErrorSpec = [404, 'ORDER_NOT_FOUND', 'No encontramos ese pedido.'];
const notFoundCategory: ErrorSpec = [404, 'CATEGORY_NOT_FOUND', 'No encontramos esa categoría.'];
const notFoundAddress: ErrorSpec = [404, 'ADDRESS_NOT_FOUND', 'No encontramos esa dirección.'];
const paymentsOff: ErrorSpec = [
  503,
  'PAYMENTS_NOT_CONFIGURED',
  'Los pagos todavía no están configurados.',
];

const operations: Operation[] = [
  // ----- Health -----
  {
    method: 'get',
    path: '/health',
    tag: 'Sistema',
    summary: 'Estado de la API y la base',
    access: 'public',
    success: { status: 200, description: 'OK', schema: S.Health },
  },
  // ----- Auth -----
  {
    method: 'post',
    path: '/auth/register',
    tag: 'Auth',
    summary: 'Crear cuenta e iniciar sesión',
    access: 'public',
    description:
      'Contraseña de 8 a 72 bytes con al menos una letra y un número. Devuelve la cookie de sesión (HttpOnly, 12 h).',
    body: registerSchema,
    rateLimited: true,
    success: { status: 201, description: 'Cuenta creada', schema: S.UserResponse },
    errors: [[409, 'EMAIL_TAKEN', 'Ya existe una cuenta con ese email.']],
  },
  {
    method: 'post',
    path: '/auth/login',
    tag: 'Auth',
    summary: 'Iniciar sesión',
    access: 'public',
    body: loginSchema,
    rateLimited: true,
    success: {
      status: 200,
      description: 'Sesión iniciada (cookie `session`)',
      schema: S.UserResponse,
    },
    errors: [[401, 'INVALID_CREDENTIALS', 'El email o la contraseña no son correctos.']],
  },
  {
    method: 'post',
    path: '/auth/logout',
    tag: 'Auth',
    summary: 'Cerrar sesión',
    access: 'public',
    success: { status: 204, description: 'Cookie borrada' },
  },
  {
    method: 'get',
    path: '/auth/me',
    tag: 'Auth',
    summary: 'Usuario de la sesión actual',
    access: 'customer',
    success: { status: 200, description: 'Usuario', schema: S.UserResponse },
  },
  // ----- Catalog -----
  {
    method: 'get',
    path: '/products',
    tag: 'Catálogo',
    summary: 'Listar productos',
    access: 'public',
    description:
      'Solo productos activos y no archivados. `q` busca en nombre y descripción sin distinguir mayúsculas ni tildes. Precios en centavos.',
    query: listProductsQuery,
    success: { status: 200, description: 'Página de productos', schema: S.PublicProductPage },
  },
  {
    method: 'get',
    path: '/products/{slug}',
    tag: 'Catálogo',
    summary: 'Detalle de producto',
    access: 'public',
    params: slugParam,
    success: { status: 200, description: 'Producto', schema: S.PublicProduct },
    errors: [notFoundProduct],
  },
  {
    method: 'get',
    path: '/categories',
    tag: 'Catálogo',
    summary: 'Listar categorías',
    access: 'public',
    success: { status: 200, description: 'Categorías', schema: S.CategoryList },
  },
  {
    method: 'get',
    path: '/store-info',
    tag: 'Catálogo',
    summary: 'Datos de la tienda (retiro y envío)',
    access: 'public',
    success: { status: 200, description: 'Datos', schema: S.StoreSettings },
  },
  // ----- Cart -----
  {
    method: 'get',
    path: '/cart',
    tag: 'Carrito',
    summary: 'Ver carrito (precios actuales y avisos)',
    access: 'customer',
    success: { status: 200, description: 'Carrito', schema: S.Cart },
  },
  {
    method: 'put',
    path: '/cart/items/{productId}',
    tag: 'Carrito',
    summary: 'Fijar la cantidad de un producto',
    access: 'customer',
    params: productIdParam,
    body: setCartItemInput,
    success: { status: 200, description: 'Carrito actualizado', schema: S.Cart },
    errors: [
      notFoundProduct,
      [409, 'INSUFFICIENT_STOCK', 'Solo hay 3 unidades disponibles.'],
      [409, 'CART_LIMIT_REACHED', 'El carrito puede tener como máximo 30 productos distintos.'],
    ],
  },
  {
    method: 'delete',
    path: '/cart/items/{productId}',
    tag: 'Carrito',
    summary: 'Quitar un producto',
    access: 'customer',
    params: productIdParam,
    success: { status: 200, description: 'Carrito actualizado', schema: S.Cart },
  },
  {
    method: 'delete',
    path: '/cart',
    tag: 'Carrito',
    summary: 'Vaciar carrito',
    access: 'customer',
    success: { status: 200, description: 'Carrito vacío', schema: S.Cart },
  },
  // ----- Addresses -----
  {
    method: 'get',
    path: '/addresses',
    tag: 'Direcciones',
    summary: 'Listar mis direcciones',
    access: 'customer',
    success: { status: 200, description: 'Direcciones', schema: S.AddressList },
  },
  {
    method: 'post',
    path: '/addresses',
    tag: 'Direcciones',
    summary: 'Crear dirección (máx. 10)',
    access: 'customer',
    body: createAddressInput,
    success: { status: 201, description: 'Creada', schema: S.Address },
    errors: [[409, 'ADDRESS_LIMIT_REACHED', 'Podés guardar como máximo 10 direcciones.']],
  },
  {
    method: 'get',
    path: '/addresses/{id}',
    tag: 'Direcciones',
    summary: 'Ver una dirección propia',
    access: 'customer',
    params: uuidParam,
    success: { status: 200, description: 'Dirección', schema: S.Address },
    errors: [notFoundAddress],
  },
  {
    method: 'patch',
    path: '/addresses/{id}',
    tag: 'Direcciones',
    summary: 'Editar una dirección propia',
    access: 'customer',
    params: uuidParam,
    body: updateAddressInput,
    success: { status: 200, description: 'Actualizada', schema: S.Address },
    errors: [notFoundAddress],
  },
  {
    method: 'delete',
    path: '/addresses/{id}',
    tag: 'Direcciones',
    summary: 'Borrar una dirección propia',
    access: 'customer',
    params: uuidParam,
    success: { status: 204, description: 'Borrada' },
    errors: [notFoundAddress],
  },
  // ----- Checkout & orders -----
  {
    method: 'post',
    path: '/checkout',
    tag: 'Pedidos',
    summary: 'Confirmar compra y reservar stock',
    access: 'customer',
    description:
      'Calcula todo en el servidor (ignora precios enviados), reserva el stock de forma atómica, crea el pedido PENDING_PAYMENT (vence a los RESERVATION_MINUTES) y devuelve la URL de pago de Mercado Pago.',
    headers: idempotencyHeader,
    body: checkoutInput,
    rateLimited: true,
    success: {
      status: 201,
      description: 'Pedido creado (200 si es una repetición con la misma Idempotency-Key)',
      schema: S.PaymentLink,
    },
    errors: [
      [400, 'ADDRESS_REQUIRED', 'Elegí una dirección para el envío.'],
      notFoundAddress,
      [409, 'CART_EMPTY', 'Tu carrito está vacío.'],
      [409, 'INSUFFICIENT_STOCK', 'No hay stock suficiente para algunos productos de tu carrito.'],
      [409, 'PRODUCT_UNAVAILABLE', 'Algunos productos de tu carrito ya no están a la venta.'],
      [409, 'ORDER_TOTAL_TOO_HIGH', 'El total del pedido supera el máximo permitido.'],
      [502, 'PAYMENT_PROVIDER_ERROR', 'No pudimos iniciar el pago con Mercado Pago.'],
      paymentsOff,
    ],
  },
  {
    method: 'get',
    path: '/orders',
    tag: 'Pedidos',
    summary: 'Mis pedidos (más nuevo primero)',
    access: 'customer',
    query: paginationQuery,
    success: { status: 200, description: 'Página de pedidos', schema: S.OrderPage },
  },
  {
    method: 'get',
    path: '/orders/{id}',
    tag: 'Pedidos',
    summary: 'Detalle de un pedido propio',
    access: 'customer',
    params: uuidParam,
    success: { status: 200, description: 'Pedido', schema: S.Order },
    errors: [notFoundOrder],
  },
  {
    method: 'post',
    path: '/orders/{id}/cancel',
    tag: 'Pedidos',
    summary: 'Cancelar un pedido pendiente de pago',
    access: 'customer',
    params: uuidParam,
    success: { status: 200, description: 'Pedido cancelado (stock liberado)', schema: S.Order },
    errors: [
      notFoundOrder,
      [409, 'ORDER_NOT_CANCELLABLE', 'Solo podés cancelar pedidos que están pendientes de pago.'],
    ],
  },
  {
    method: 'post',
    path: '/orders/{id}/pay',
    tag: 'Pedidos',
    summary: 'Volver a abrir el pago de un pedido pendiente',
    access: 'customer',
    params: uuidParam,
    success: { status: 200, description: 'URL de pago', schema: S.PaymentLink },
    errors: [
      notFoundOrder,
      [409, 'ORDER_NOT_PAYABLE', 'Este pedido ya no se puede pagar.'],
      [502, 'PAYMENT_PROVIDER_ERROR', 'No encontramos el link de pago.'],
    ],
  },
  {
    method: 'post',
    path: '/orders/{id}/sync',
    tag: 'Pedidos',
    summary: 'Consultar el estado real del pago en Mercado Pago',
    access: 'customer',
    params: uuidParam,
    success: { status: 200, description: 'Pedido actualizado', schema: S.Order },
    errors: [
      notFoundOrder,
      [502, 'PAYMENT_PROVIDER_ERROR', 'No pudimos consultar el estado del pago.'],
      paymentsOff,
    ],
  },
  // ----- Webhooks -----
  {
    method: 'post',
    path: '/webhooks/mercadopago',
    tag: 'Webhooks',
    summary: 'Notificaciones de Mercado Pago',
    access: 'webhook',
    description:
      'Autenticado por la firma `x-signature` (HMAC-SHA256 con MP_WEBHOOK_SECRET). No usa cookies ni chequeo de Origin. El cuerpo no se usa como fuente de verdad: el pago se consulta a la API de Mercado Pago.',
    query: webhookQuery,
    success: { status: 200, description: 'Recibido', schema: S.WebhookAck },
    errors: [
      [400, 'INVALID_NOTIFICATION', 'La notificación no tiene un id de pago válido.'],
      [401, 'INVALID_SIGNATURE', 'La firma de la notificación no es válida.'],
      paymentsOff,
    ],
  },
  // ----- Admin: categories -----
  {
    method: 'get',
    path: '/admin/categories',
    tag: 'Admin: catálogo',
    summary: 'Listar categorías con cantidad de productos',
    access: 'admin',
    success: { status: 200, description: 'Categorías', schema: S.AdminCategoryList },
  },
  {
    method: 'post',
    path: '/admin/categories',
    tag: 'Admin: catálogo',
    summary: 'Crear categoría',
    access: 'admin',
    body: categoryInput,
    success: { status: 201, description: 'Creada', schema: S.Category },
  },
  {
    method: 'patch',
    path: '/admin/categories/{id}',
    tag: 'Admin: catálogo',
    summary: 'Renombrar categoría',
    access: 'admin',
    params: uuidParam,
    body: categoryInput,
    success: { status: 200, description: 'Actualizada', schema: S.Category },
    errors: [notFoundCategory],
  },
  {
    method: 'delete',
    path: '/admin/categories/{id}',
    tag: 'Admin: catálogo',
    summary: 'Borrar categoría sin productos',
    access: 'admin',
    params: uuidParam,
    success: { status: 204, description: 'Borrada' },
    errors: [
      notFoundCategory,
      [409, 'CATEGORY_HAS_PRODUCTS', 'No podés borrar una categoría que tiene productos.'],
    ],
  },
  // ----- Admin: products -----
  {
    method: 'get',
    path: '/admin/products',
    tag: 'Admin: catálogo',
    summary: 'Listar productos (con stock)',
    access: 'admin',
    query: adminProductsQuery,
    success: { status: 200, description: 'Página de productos', schema: S.AdminProductPage },
  },
  {
    method: 'post',
    path: '/admin/products',
    tag: 'Admin: catálogo',
    summary: 'Crear producto',
    access: 'admin',
    body: createProductInput,
    success: { status: 201, description: 'Creado', schema: S.AdminProduct },
    errors: [notFoundCategory],
  },
  {
    method: 'get',
    path: '/admin/products/{id}',
    tag: 'Admin: catálogo',
    summary: 'Ver producto',
    access: 'admin',
    params: uuidParam,
    success: { status: 200, description: 'Producto', schema: S.AdminProduct },
    errors: [notFoundProduct],
  },
  {
    method: 'patch',
    path: '/admin/products/{id}',
    tag: 'Admin: catálogo',
    summary: 'Editar producto (el stock se ajusta aparte)',
    access: 'admin',
    params: uuidParam,
    body: updateProductInput,
    success: { status: 200, description: 'Actualizado', schema: S.AdminProduct },
    errors: [
      notFoundProduct,
      notFoundCategory,
      [409, 'PRODUCT_ARCHIVED', 'El producto está archivado y no se puede editar.'],
    ],
  },
  {
    method: 'delete',
    path: '/admin/products/{id}',
    tag: 'Admin: catálogo',
    summary: 'Archivar producto (borrado lógico)',
    access: 'admin',
    params: uuidParam,
    success: { status: 204, description: 'Archivado' },
    errors: [notFoundProduct],
  },
  {
    method: 'post',
    path: '/admin/products/{id}/stock',
    tag: 'Admin: catálogo',
    summary: 'Ajustar stock con motivo',
    access: 'admin',
    params: uuidParam,
    body: stockAdjustmentInput,
    success: { status: 200, description: 'Stock ajustado', schema: S.AdminProduct },
    errors: [
      notFoundProduct,
      [409, 'STOCK_BELOW_RESERVED', 'El ajuste dejaría menos stock que las unidades reservadas.'],
    ],
  },
  {
    method: 'get',
    path: '/admin/products/{id}/stock-movements',
    tag: 'Admin: catálogo',
    summary: 'Últimos 100 movimientos de stock',
    access: 'admin',
    params: uuidParam,
    success: { status: 200, description: 'Movimientos', schema: S.StockMovementList },
    errors: [notFoundProduct],
  },
  {
    method: 'post',
    path: '/admin/products/{id}/images',
    tag: 'Admin: catálogo',
    summary: 'Subir imagen (multipart, campo "image")',
    access: 'admin',
    description:
      'JPEG, PNG o WebP (validado por contenido), máximo 5 MB y 8 por producto. Se reencodea a WebP de hasta 1600 px sin metadatos.',
    params: uuidParam,
    multipart: true,
    success: { status: 201, description: 'Imagen subida', schema: S.Image },
    errors: [
      [400, 'IMAGE_REQUIRED', 'Mandá una imagen en el campo "image".'],
      notFoundProduct,
      [409, 'TOO_MANY_IMAGES', 'Un producto puede tener como máximo 8 imágenes.'],
      [413, 'FILE_TOO_LARGE', 'La imagen supera el máximo de 5 MB.'],
      [415, 'UNSUPPORTED_IMAGE_TYPE', 'La imagen tiene que ser JPEG, PNG o WebP.'],
      [422, 'INVALID_IMAGE', 'No pudimos procesar la imagen.'],
    ],
  },
  {
    method: 'delete',
    path: '/admin/products/{id}/images/{imageId}',
    tag: 'Admin: catálogo',
    summary: 'Borrar imagen',
    access: 'admin',
    params: imageParams,
    success: { status: 204, description: 'Borrada' },
    errors: [[404, 'IMAGE_NOT_FOUND', 'No encontramos esa imagen.']],
  },
  {
    method: 'put',
    path: '/admin/products/{id}/images/order',
    tag: 'Admin: catálogo',
    summary: 'Reordenar imágenes',
    access: 'admin',
    params: uuidParam,
    body: reorderImagesInput,
    success: { status: 200, description: 'Nuevo orden', schema: S.ImageList },
    errors: [
      notFoundProduct,
      [
        400,
        'INVALID_IMAGE_ORDER',
        'Mandá todos los ids de las imágenes del producto, sin repetir.',
      ],
    ],
  },
  // ----- Admin: settings & stats -----
  {
    method: 'get',
    path: '/admin/settings',
    tag: 'Admin: tienda',
    summary: 'Ver configuración',
    access: 'admin',
    success: { status: 200, description: 'Configuración', schema: S.StoreSettings },
  },
  {
    method: 'patch',
    path: '/admin/settings',
    tag: 'Admin: tienda',
    summary: 'Editar configuración',
    access: 'admin',
    body: updateSettingsSchema,
    success: { status: 200, description: 'Actualizada', schema: S.StoreSettings },
  },
  {
    method: 'get',
    path: '/admin/stats',
    tag: 'Admin: tienda',
    summary: 'Estadísticas',
    access: 'admin',
    success: { status: 200, description: 'Estadísticas', schema: S.Stats },
  },
  // ----- Admin: orders -----
  {
    method: 'get',
    path: '/admin/orders',
    tag: 'Admin: pedidos',
    summary: 'Listar pedidos con filtros',
    access: 'admin',
    query: adminOrdersQuery,
    success: { status: 200, description: 'Página de pedidos', schema: S.AdminOrderPage },
  },
  {
    method: 'get',
    path: '/admin/orders/{id}',
    tag: 'Admin: pedidos',
    summary: 'Ver pedido',
    access: 'admin',
    params: uuidParam,
    success: { status: 200, description: 'Pedido', schema: S.AdminOrder },
    errors: [notFoundOrder],
  },
  {
    method: 'patch',
    path: '/admin/orders/{id}/status',
    tag: 'Admin: pedidos',
    summary: 'Cambiar estado (máquina de estados)',
    access: 'admin',
    description:
      'PAID→PREPARING; PREPARING→READY_FOR_PICKUP (retiro) o SHIPPED (envío); READY_FOR_PICKUP→DELIVERED; SHIPPED→DELIVERED. `fromStatus` opcional para detectar cambios concurrentes.',
    params: uuidParam,
    body: changeStatusInput,
    success: { status: 200, description: 'Estado cambiado', schema: S.AdminOrder },
    errors: [
      notFoundOrder,
      [409, 'INVALID_STATUS_TRANSITION', 'No se puede pasar un pedido de PAID a DELIVERED.'],
      [409, 'ORDER_STATUS_CHANGED', 'El estado del pedido cambió mientras lo editabas.'],
    ],
  },
  {
    method: 'post',
    path: '/admin/orders/{id}/cancel',
    tag: 'Admin: pedidos',
    summary: 'Cancelar pedido pagado (devuelve stock, reembolso manual)',
    access: 'admin',
    params: uuidParam,
    body: adminCancelInput,
    success: { status: 200, description: 'Cancelado', schema: S.AdminOrder },
    errors: [
      notFoundOrder,
      [
        409,
        'ORDER_NOT_CANCELLABLE',
        'Solo se pueden cancelar pedidos pagados, en preparación o listos para retirar.',
      ],
      [409, 'ORDER_STATUS_CHANGED', 'El estado del pedido cambió mientras lo editabas.'],
    ],
  },
  {
    method: 'post',
    path: '/admin/orders/{id}/resolve-attention',
    tag: 'Admin: pedidos',
    summary: 'Marcar como resuelto lo que requería atención',
    access: 'admin',
    params: uuidParam,
    success: { status: 200, description: 'Actualizado', schema: S.AdminOrder },
    errors: [notFoundOrder],
  },
];

export function buildOpenApiDocument(env: Pick<Env, 'PUBLIC_API_URL'>) {
  const registry = new OpenAPIRegistry();
  registry.registerComponent('securitySchemes', 'cookieAuth', {
    type: 'apiKey',
    in: 'cookie',
    name: 'session',
  });

  for (const op of operations) {
    const request: NonNullable<RouteConfig['request']> = {};
    if (op.params) request.params = op.params;
    if (op.query) request.query = op.query;
    if (op.headers) request.headers = op.headers;
    if (op.body) {
      request.body = { required: true, content: { 'application/json': { schema: op.body } } };
    }
    if (op.multipart) {
      request.body = {
        required: true,
        content: {
          'multipart/form-data': {
            schema: z.object({
              image: z.string().openapi({ type: 'string', format: 'binary' }),
              alt: z.string().max(200).optional(),
            }),
          },
        },
      };
    }
    registry.registerPath({
      method: op.method,
      path: `${API}${op.path}`,
      tags: [op.tag],
      summary: op.summary,
      ...(op.description ? { description: op.description } : {}),
      ...(op.access === 'customer' || op.access === 'admin'
        ? { security: [{ cookieAuth: [] }] }
        : {}),
      request,
      responses: buildResponses(op),
    });
  }

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Tienda online - API',
      version: '1.0.0',
      description: [
        'API REST de la tienda. Dinero siempre en centavos enteros (ARS), fechas en UTC (ISO 8601), IDs UUID.',
        'Sesión por cookie HttpOnly `session`. Toda solicitud POST/PUT/PATCH/DELETE tiene que mandar `Origin` permitido y `Content-Type: application/json` (salvo la subida de imágenes y el webhook).',
        'Errores: `{ "error": { "code", "message", "details"? } }`.',
      ].join('\n\n'),
    },
    servers: [{ url: env.PUBLIC_API_URL }],
  });
}
