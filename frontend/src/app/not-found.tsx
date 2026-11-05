import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';

export const metadata: Metadata = { title: 'Página no encontrada' };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center"
      >
        <p className="text-sm font-semibold tracking-widest text-accent uppercase">Error 404</p>
        <h1 className="mt-3 font-display text-4xl text-ink">No encontramos esta página</h1>
        <p className="mt-4 text-muted">
          Puede que el enlace esté mal escrito o que el producto ya no esté disponible.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/products">Ver productos</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Ir al inicio
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
