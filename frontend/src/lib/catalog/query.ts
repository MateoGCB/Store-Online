/**
 * Catalog filters live in the URL (shareable, back button works). In the URL prices are
 * whole pesos (?minPrice=1000); the API expects cents.
 */
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Más nuevos' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'name', label: 'Nombre (A-Z)' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];
export const PAGE_SIZE = 12;

export interface CatalogFilters {
  q: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  sort: SortValue;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function pesos(value: string): number | null {
  if (!/^\d{1,8}$/.test(value)) return null;
  return Number(value);
}

/** Invalid values are ignored instead of breaking the page. */
export function parseCatalogParams(params: RawParams): CatalogFilters {
  const sort = first(params.sort);
  const page = Number(first(params.page));
  return {
    q: first(params.q).slice(0, 100),
    category: /^[a-z0-9-]{1,120}$/.test(first(params.category)) ? first(params.category) : '',
    minPrice: pesos(first(params.minPrice)),
    maxPrice: pesos(first(params.maxPrice)),
    inStock: first(params.inStock) === 'true',
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as SortValue) : 'newest',
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

/** Query string for GET /api/v1/products (stable order, so it is a good cache key). */
export function toApiQuery(filters: CatalogFilters): string {
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q);
  if (filters.category) query.set('category', filters.category);
  if (filters.minPrice !== null) query.set('minPrice', String(filters.minPrice * 100));
  if (filters.maxPrice !== null) query.set('maxPrice', String(filters.maxPrice * 100));
  if (filters.inStock) query.set('inStock', 'true');
  query.set('sort', filters.sort);
  query.set('page', String(filters.page));
  query.set('pageSize', String(PAGE_SIZE));
  return query.toString();
}

/** Link to /products with the given filters (defaults are omitted to keep URLs short). */
export function catalogHref(
  filters: CatalogFilters,
  changes: Partial<CatalogFilters> = {},
): string {
  const next = { ...filters, ...changes };
  const query = new URLSearchParams();
  if (next.q) query.set('q', next.q);
  if (next.category) query.set('category', next.category);
  if (next.minPrice !== null) query.set('minPrice', String(next.minPrice));
  if (next.maxPrice !== null) query.set('maxPrice', String(next.maxPrice));
  if (next.inStock) query.set('inStock', 'true');
  if (next.sort !== 'newest') query.set('sort', next.sort);
  if (next.page > 1) query.set('page', String(next.page));
  const qs = query.toString();
  return qs ? `/products?${qs}` : '/products';
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return Boolean(
    filters.q ||
    filters.category ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.inStock,
  );
}
