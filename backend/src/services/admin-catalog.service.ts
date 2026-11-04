import { z } from 'zod';
import type { Db, Tx } from '../db.js';
import type { Deps } from '../deps.js';
import type { Prisma } from '../generated/prisma/client.js';
import { conflict, notFound } from '../lib/errors.js';
import { MAX_PRICE_CENTS, MAX_STOCK } from '../lib/money.js';
import { type Page, paginationQuery, toSkipTake } from '../lib/pagination.js';
import { uniqueSlug } from '../lib/slug.js';
import { normalizeText } from '../lib/text.js';
import { trimmed } from '../lib/validation.js';
import { adminProductDto, categoryDto } from './dto.js';

// ---------- Categories ----------

export const categoryInput = z.object({ name: trimmed(1, 60) }).strict();

const categoryNotFound = () => notFound('CATEGORY_NOT_FOUND', 'No encontramos esa categoría.');

export async function listAdminCategories(deps: Deps) {
  const categories = await deps.prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  return categories.map((c) => ({ ...categoryDto(c), productCount: c._count.products }));
}

async function categorySlug(db: Db | Tx, name: string, excludeId?: string) {
  return uniqueSlug(name, async (slug) => {
    const found = await db.category.findUnique({ where: { slug } });
    return !!found && found.id !== excludeId;
  });
}

export async function createCategory(deps: Deps, input: z.output<typeof categoryInput>) {
  const slug = await categorySlug(deps.prisma, input.name);
  const category = await deps.prisma.category.create({ data: { name: input.name, slug } });
  return categoryDto(category);
}

export async function updateCategory(
  deps: Deps,
  id: string,
  input: z.output<typeof categoryInput>,
) {
  const existing = await deps.prisma.category.findUnique({ where: { id } });
  if (!existing) throw categoryNotFound();
  const slug = await categorySlug(deps.prisma, input.name, id);
  const category = await deps.prisma.category.update({
    where: { id },
    data: { name: input.name, slug },
  });
  return categoryDto(category);
}

export async function deleteCategory(deps: Deps, id: string) {
  const category = await deps.prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) throw categoryNotFound();
  if (category._count.products > 0) {
    throw conflict(
      'CATEGORY_HAS_PRODUCTS',
      'No podés borrar una categoría que tiene productos (incluidos los archivados).',
      { productCount: category._count.products },
    );
  }
  await deps.prisma.category.delete({ where: { id } });
}

// ---------- Products ----------

const productFields = {
  name: trimmed(1, 120),
  description: trimmed(0, 5000),
  priceCents: z.number().int().min(1).max(MAX_PRICE_CENTS),
  categoryId: z.uuid(),
  active: z.boolean(),
};

export const createProductInput = z
  .object({
    ...productFields,
    active: productFields.active.default(true),
    stock: z.number().int().min(0).max(MAX_STOCK).default(0),
  })
  .strict();

export const updateProductInput = z.object(productFields).partial().strict();

export const stockAdjustmentInput = z
  .object({
    delta: z
      .number()
      .int()
      .min(-MAX_STOCK)
      .max(MAX_STOCK)
      .refine((v) => v !== 0, 'El ajuste no puede ser 0.'),
    note: trimmed(1, 200),
  })
  .strict();

export const adminProductsQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  categoryId: z.uuid().optional(),
  archived: z.enum(['true', 'false', 'all']).default('false'),
});

const productNotFound = () => notFound('PRODUCT_NOT_FOUND', 'No encontramos ese producto.');
const withRelations = { images: true, category: true } as const;

function searchText(name: string, description: string) {
  return normalizeText(`${name} ${description}`);
}

async function productSlug(db: Db | Tx, name: string, excludeId?: string) {
  return uniqueSlug(name, async (slug) => {
    const found = await db.product.findUnique({ where: { slug } });
    return !!found && found.id !== excludeId;
  });
}

async function ensureCategory(db: Db | Tx, categoryId: string) {
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) throw categoryNotFound();
}

export async function listAdminProducts(
  deps: Deps,
  query: z.output<typeof adminProductsQuery>,
): Promise<Page<ReturnType<typeof adminProductDto>>> {
  const words = query.q ? normalizeText(query.q).split(/\s+/).filter(Boolean) : [];
  const where: Prisma.ProductWhereInput = {
    ...(query.archived === 'all'
      ? {}
      : { archivedAt: query.archived === 'true' ? { not: null } : null }),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(words.length ? { AND: words.map((w) => ({ searchText: { contains: w } })) } : {}),
  };
  const [total, products] = await deps.prisma.$transaction([
    deps.prisma.product.count({ where }),
    deps.prisma.product.findMany({
      where,
      include: withRelations,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...toSkipTake(query),
    }),
  ]);
  return {
    items: products.map((p) => adminProductDto(p, deps.storage)),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

export async function getAdminProduct(deps: Deps, id: string) {
  const product = await deps.prisma.product.findUnique({ where: { id }, include: withRelations });
  if (!product) throw productNotFound();
  return adminProductDto(product, deps.storage);
}

export async function createProduct(
  deps: Deps,
  actorId: string,
  input: z.output<typeof createProductInput>,
) {
  const product = await deps.prisma.$transaction(async (tx) => {
    await ensureCategory(tx, input.categoryId);
    const created = await tx.product.create({
      data: {
        name: input.name,
        slug: await productSlug(tx, input.name),
        description: input.description,
        searchText: searchText(input.name, input.description),
        priceCents: input.priceCents,
        stock: input.stock,
        active: input.active,
        categoryId: input.categoryId,
      },
    });
    if (input.stock > 0) {
      await tx.stockMovement.create({
        data: { productId: created.id, delta: input.stock, reason: 'INITIAL', actorId },
      });
    }
    return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: withRelations });
  });
  return adminProductDto(product, deps.storage);
}

export async function updateProduct(
  deps: Deps,
  id: string,
  input: z.output<typeof updateProductInput>,
) {
  const product = await deps.prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) throw productNotFound();
    if (existing.archivedAt) {
      throw conflict('PRODUCT_ARCHIVED', 'El producto está archivado y no se puede editar.');
    }
    if (input.categoryId) await ensureCategory(tx, input.categoryId);
    const name = input.name ?? existing.name;
    const description = input.description ?? existing.description;
    return tx.product.update({
      where: { id },
      data: {
        ...input,
        ...(input.name && input.name !== existing.name
          ? { slug: await productSlug(tx, input.name, id) }
          : {}),
        searchText: searchText(name, description),
      },
      include: withRelations,
    });
  });
  return adminProductDto(product, deps.storage);
}

/** Products are never deleted (orders reference them): they are archived instead. */
export async function archiveProduct(deps: Deps, id: string) {
  const existing = await deps.prisma.product.findUnique({ where: { id } });
  if (!existing) throw productNotFound();
  if (!existing.archivedAt) {
    await deps.prisma.product.update({
      where: { id },
      data: { archivedAt: deps.clock.now(), active: false },
    });
  }
}

/**
 * Adds `delta` units (negative to remove). A single conditional UPDATE guarantees the
 * result never goes below the units reserved by pending orders, even under concurrency.
 */
export async function adjustStock(
  deps: Deps,
  id: string,
  actorId: string,
  input: z.output<typeof stockAdjustmentInput>,
) {
  const product = await deps.prisma.$transaction(async (tx) => {
    const updated = await tx.$executeRaw`
      UPDATE products
         SET stock = stock + ${input.delta}, updated_at = ${deps.clock.now()}
       WHERE id = ${id}::uuid
         AND stock + ${input.delta} >= reserved
         AND stock + ${input.delta} >= 0
         AND stock + ${input.delta} <= ${MAX_STOCK}`;
    if (updated === 0) {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) throw productNotFound();
      throw conflict(
        'STOCK_BELOW_RESERVED',
        'El ajuste dejaría menos stock que las unidades reservadas por pedidos pendientes (o fuera de rango).',
        { stock: existing.stock, reserved: existing.reserved },
      );
    }
    await tx.stockMovement.create({
      data: {
        productId: id,
        delta: input.delta,
        reason: 'ADMIN_ADJUSTMENT',
        note: input.note,
        actorId,
      },
    });
    return tx.product.findUniqueOrThrow({ where: { id }, include: withRelations });
  });
  return adminProductDto(product, deps.storage);
}

export async function listStockMovements(deps: Deps, productId: string) {
  const product = await deps.prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw productNotFound();
  const movements = await deps.prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return movements.map((m) => ({
    id: m.id,
    delta: m.delta,
    reason: m.reason,
    note: m.note,
    orderId: m.orderId,
    actorId: m.actorId,
    createdAt: m.createdAt.toISOString(),
  }));
}
