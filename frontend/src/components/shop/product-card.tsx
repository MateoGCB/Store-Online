import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/ui/price';
import type { PublicProduct } from '@/lib/api/types';
import { ProductImage } from './product-image';

export function ProductCard({ product, priority }: { product: PublicProduct; priority?: boolean }) {
  return (
    <li className="group relative">
      <ProductImage
        image={product.images[0]}
        alt={product.name}
        sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, 50vw"
        priority={priority}
        className="rounded-card transition-transform duration-300 group-hover:scale-[1.01]"
      />
      {!product.inStock && <Badge className="absolute top-3 left-3">Sin stock</Badge>}
      <div className="mt-3 space-y-1">
        <p className="text-xs tracking-wide text-subtle uppercase">{product.category.name}</p>
        <h3 className="text-sm font-medium text-ink sm:text-base">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <Price cents={product.priceCents} className="text-sm font-semibold text-ink sm:text-base" />
      </div>
    </li>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: PublicProduct[];
  priorityCount?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </ul>
  );
}
