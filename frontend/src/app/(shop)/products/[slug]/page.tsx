import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronLeft, Store, Truck } from 'lucide-react';
import { AddToCart } from '@/components/shop/add-to-cart';
import { ProductGallery } from '@/components/shop/product-gallery';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { getProduct } from '@/lib/api/server';

export async function generateMetadata(props: PageProps<'/products/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: 'Producto no encontrado' };
  const description = product.description.slice(0, 160) || `${product.name} en nuestra tienda.`;
  const image = product.images[0];
  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      type: 'website',
      ...(image ? { images: [{ url: image.url, alt: image.alt || product.name }] } : {}),
    },
  };
}

function availabilityText(maxPurchasable: number, inStock: boolean): string {
  if (!inStock || maxPurchasable <= 0) return 'Sin stock';
  if (maxPurchasable <= 3) return 'Últimas unidades disponibles';
  return 'Disponible';
}

async function ProductDetail({ params }: { params: PageProps<'/products/[slug]'>['params'] }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <article className="grid gap-8 lg:grid-cols-2 lg:gap-14">
      <ProductGallery images={product.images} name={product.name} />
      <div className="space-y-6 lg:pt-4">
        <div className="space-y-3">
          <Link
            href={`/products?category=${product.category.slug}`}
            className="text-xs font-medium tracking-wider text-accent uppercase hover:underline"
          >
            {product.category.name}
          </Link>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">{product.name}</h1>
          <Price cents={product.priceCents} className="block text-2xl font-semibold text-ink" />
          <p className={`text-sm font-medium ${product.inStock ? 'text-success' : 'text-danger'}`}>
            {availabilityText(product.maxPurchasable, product.inStock)}
          </p>
        </div>
        <AddToCart product={product} />
        {product.description && (
          <div className="border-t border-line pt-6">
            <h2 className="text-sm font-semibold text-ink">Descripción</h2>
            {/* Plain text: never interpreted as HTML. */}
            <p className="mt-2 leading-relaxed whitespace-pre-line text-muted">
              {product.description}
            </p>
          </div>
        )}
        <ul className="space-y-2 border-t border-line pt-6 text-sm text-muted">
          <li className="flex items-center gap-2">
            <Store aria-hidden className="size-4" /> Retiro sin cargo en el local
          </li>
          <li className="flex items-center gap-2">
            <Truck aria-hidden className="size-4" /> Envío a domicilio con costo fijo
          </li>
        </ul>
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <LoadingRegion label="Cargando producto…">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <Skeleton className="aspect-square w-full rounded-card" />
        <div className="space-y-4 lg:pt-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-13 w-56" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export default function ProductPage(props: PageProps<'/products/[slug]'>) {
  return (
    <div className="space-y-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" /> Volver a productos
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ProductDetail params={props.params} />
      </Suspense>
    </div>
  );
}
