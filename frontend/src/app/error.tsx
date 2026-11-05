'use client';

import { Button, ButtonLink } from '@/components/ui/button';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <h1 className="font-display text-4xl text-ink">Algo salió mal</h1>
      <p className="mt-4 text-muted">
        No pudimos mostrar esta página. Probá de nuevo en unos segundos.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Reintentar</Button>
        <ButtonLink href="/" variant="secondary">
          Ir al inicio
        </ButtonLink>
      </div>
    </main>
  );
}
