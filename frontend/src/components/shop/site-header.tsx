import Link from 'next/link';
import { Suspense } from 'react';
import { HeaderActions } from './header-actions';
import { SearchForm } from './search-form';
import { StoreName } from './store-name';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl"
        >
          <Suspense fallback="Tienda">
            <StoreName />
          </Suspense>
        </Link>
        <nav aria-label="Principal" className="hidden md:block">
          <Link
            href="/products"
            className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-ink/5 hover:text-ink"
          >
            Productos
          </Link>
        </nav>
        <div className="ml-auto lg:order-last">
          <HeaderActions />
        </div>
        <SearchForm className="order-last w-full lg:order-none lg:ml-auto lg:max-w-md" />
      </div>
    </header>
  );
}
