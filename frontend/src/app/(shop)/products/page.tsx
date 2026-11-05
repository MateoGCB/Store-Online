import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CatalogFilters } from '@/components/shop/catalog-filters';
import { ProductGrid } from '@/components/shop/product-card';
import { ButtonLink } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { getCategories, getProducts } from '@/lib/api/server';
import { catalogHref, hasActiveFilters, parseCatalogParams, toApiQuery } from '@/lib/catalog/query';

export const metadata: Metadata = {
  title: 'Productos',
  description: 'Todo el catálogo: filtrá por categoría, precio y disponibilidad.',
};

function ResultsSkeleton() {
  return (
    <LoadingRegion label="Cargando productos…">
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <Skeleton className="h-80 w-full rounded-card" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-card" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

async function CatalogResults({
  searchParams,
}: {
  searchParams: PageProps<'/products'>['searchParams'];
}) {
  const filters = parseCatalogParams(await searchParams);
  let data;
  let categories;
  try {
    [data, categories] = await Promise.all([getProducts(toApiQuery(filters)), getCategories()]);
  } catch {
    return (
      <ErrorState
        title="No pudimos cargar los productos"
        action={<ButtonLink href={catalogHref(filters)}>Reintentar</ButtonLink>}
      />
    );
  }
  const categoryName = categories.find((c) => c.slug === filters.category)?.name;

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
      <aside aria-label="Filtros">
        <CatalogFilters filters={filters} categories={categories} />
      </aside>
      <section aria-labelledby="results-heading" className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="results-heading" className="text-sm text-muted" aria-live="polite">
            {data.total === 1 ? '1 producto' : `${data.total} productos`}
            {filters.q && <> para “{filters.q}”</>}
            {categoryName && <> en {categoryName}</>}
          </h2>
        </div>
        {data.items.length === 0 ? (
          <EmptyState
            title="No encontramos productos con esos filtros"
            description="Probá con otra búsqueda o sacá algunos filtros."
            action={
              hasActiveFilters(filters) ? (
                <ButtonLink href="/products" variant="secondary">
                  Ver todos los productos
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <ProductGrid products={data.items} priorityCount={4} />
        )}
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          hrefFor={(page) => catalogHref(filters, { page })}
          label="Páginas de productos"
        />
      </section>
    </div>
  );
}

export default function ProductsPage(props: PageProps<'/products'>) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl text-ink sm:text-4xl">Productos</h1>
        <p className="text-muted">Objetos para la cocina, el hogar, el jardín y tu escritorio.</p>
      </header>
      <Suspense fallback={<ResultsSkeleton />}>
        <CatalogResults searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
