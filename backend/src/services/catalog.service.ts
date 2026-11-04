import { z } from 'zod';
import type { Deps } from '../deps.js';
import type { Prisma } from '../generated/prisma/client.js';
import { notFound } from '../lib/errors.js';
import { MAX_PRICE_CENTS } from '../lib/money.js';
import { type Page, paginationQuery, toSkipTake } from '../lib/pagination.js';
import { normalizeText } from '../lib/text.js';
import { categoryDto, publicProductDto } from './dto.js';

export const productSortValues = ['newest', 'price_asc', 'price_desc', 'name'] as const;

export const listProductsQuery = paginationQuery.extend({
  category: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().int().min(0).max(MAX_PRICE_CENTS).optional(),
  maxPrice: z.coerce.number().int().min(0).max(MAX_PRICE_CENTS).optional(),
  inStock: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sort: z.enum(productSortValues).default('newest'),
});

const SORTS: Record<(typeof productSortValues)[number], Prisma.ProductOrderByWithRelationInput[]> =
  {
    newest: [{ createdAt: 'desc' }, { id: 'asc' }],
    price_asc: [{ priceCents: 'asc' }, { id: 'asc' }],
    price_desc: [{ priceCents: 'desc' }, { id: 'asc' }],
    name: [{ name: 'asc' }, { id: 'asc' }],
  };

/** Products visible to the public: active and not archived. */
export const visibleProduct = { active: true, archivedAt: null } satisfies Prisma.ProductWhereInput;

export async function listProducts(
  deps: Deps,
  query: z.output<typeof listProductsQuery>,
): Promise<Page<ReturnType<typeof publicProductDto>>> {
  const words = query.q ? normalizeText(query.q).split(/\s+/).filter(Boolean) : [];
  const where: Prisma.ProductWhereInput = {
    ...visibleProduct,
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? { priceCents: { gte: query.minPrice, lte: query.maxPrice } }
      : {}),
    ...(query.inStock === true ? { stock: { gt: deps.prisma.product.fields.reserved } } : {}),
    ...(words.length ? { AND: words.map((w) => ({ searchText: { contains: w } })) } : {}),
  };
  const [total, products] = await deps.prisma.$transaction([
    deps.prisma.product.count({ where }),
    deps.prisma.product.findMany({
      where,
      include: { images: true, category: true },
      orderBy: SORTS[query.sort],
      ...toSkipTake(query),
    }),
  ]);
  return {
    items: products.map((p) => publicProductDto(p, deps.storage)),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

export async function getProductBySlug(deps: Deps, slug: string) {
  const product = await deps.prisma.product.findFirst({
    where: { slug, ...visibleProduct },
    include: { images: true, category: true },
  });
  if (!product) throw notFound('PRODUCT_NOT_FOUND', 'No encontramos ese producto.');
  return publicProductDto(product, deps.storage);
}

export async function listCategories(deps: Deps) {
  const categories = await deps.prisma.category.findMany({ orderBy: { name: 'asc' } });
  return categories.map(categoryDto);
}
