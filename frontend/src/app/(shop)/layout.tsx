import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
