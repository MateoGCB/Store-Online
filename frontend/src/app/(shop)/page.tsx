import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { ProductGrid } from '@/components/shop/product-card';
import { ButtonLink } from '@/components/ui/button';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { getCategories, getProducts, getStoreInfo } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const info = await getStoreInfo().catch(() => null);
  const name = info?.storeName || 'Tienda online';
  return {
    title: `${name} · Objetos de diseño para tu casa`,
    openGraph: { title: name, description: 'Objetos de diseño para tu casa.', type: 'website' },
  };
}

async function Categories() {
  await connection();
  const categories = await getCategories().catch(() => null);
  if (!categories?.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <li key={c.id}>
          <Link
            href={`/products?category=${c.slug}`}
            className="inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function LatestProducts() {
  await connection();
  const data = await getProducts('sort=newest&page=1&pageSize=8').catch(() => null);
  if (!data) {
    return <ErrorState title="No pudimos cargar los productos" />;
  }
  if (data.items.length === 0) {
    return <EmptyState title="Todavía no hay productos" description="Volvé pronto." />;
  }
  return <ProductGrid products={data.items} priorityCount={4} />;
}

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="overflow-hidden rounded-card bg-ink px-6 py-14 text-canvas sm:px-12 sm:py-20">
        <p className="text-sm font-medium tracking-widest text-[#e8a582] uppercase">
          Hecho para durar
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
          Objetos de diseño para tu casa
        </h1>
        <p className="mt-5 max-w-xl text-base text-canvas/80 sm:text-lg">
          Cerámica, textiles, plantas y papelería elegidos con cuidado. Retirá en el local o
          recibilo en tu casa.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/products" size="lg" variant="secondary">
            Ver productos <ArrowRight aria-hidden className="size-5" />
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="categories-heading" className="space-y-4">
        <h2 id="categories-heading" className="font-display text-2xl text-ink">
          Categorías
        </h2>
        <Suspense fallback={<Skeleton className="h-10 w-full max-w-lg rounded-full" />}>
          <Categories />
        </Suspense>
      </section>

      <section aria-labelledby="latest-heading" className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 id="latest-heading" className="font-display text-2xl text-ink">
            Recién llegados
          </h2>
          <Link href="/products" className="text-sm font-medium text-accent hover:underline">
            Ver todo
          </Link>
        </div>
        <Suspense
          fallback={
            <LoadingRegion label="Cargando productos…">
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-card" />
                ))}
              </div>
            </LoadingRegion>
          }
        >
          <LatestProducts />
        </Suspense>
      </section>
    </div>
  );
}
