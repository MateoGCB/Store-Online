import Link from 'next/link';
import { Suspense } from 'react';
import { PickupAddress, StoreName } from './store-name';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div>
          <p className="font-display text-lg font-semibold text-ink">
            <Suspense fallback="Tienda">
              <StoreName />
            </Suspense>
          </p>
          <p className="mt-2 text-sm text-muted">Objetos de diseño para tu casa.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Retiro en el local</p>
          <p className="mt-2 text-sm text-muted">
            <Suspense fallback="…">
              <PickupAddress />
            </Suspense>
          </p>
        </div>
        <nav aria-label="Enlaces del pie de página">
          <p className="text-sm font-semibold text-ink">Explorá</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li>
              <Link href="/products" className="hover:text-ink hover:underline">
                Todos los productos
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className="hover:text-ink hover:underline">
                Mis pedidos
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-ink hover:underline">
                Carrito
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
