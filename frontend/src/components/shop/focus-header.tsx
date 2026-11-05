import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { StoreName } from './store-name';

/**
 * Reduced header for focus pages (login, register, checkout): only the store name and a
 * single way back. No search, cart or account menu that could pull the buyer away.
 */
export function FocusHeader({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <header className="border-b border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl"
        >
          <Suspense fallback="Tienda">
            <StoreName />
          </Suspense>
        </Link>
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink hover:bg-ink/5"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {backLabel}
        </Link>
      </div>
    </header>
  );
}
