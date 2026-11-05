'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useCart, useClearCart, useRemoveCartItem, useSetCartItem } from '@/hooks/use-cart';
import { errorMessage } from '@/lib/api/errors';
import type { CartLine as CartLineType } from '@/lib/api/types';
import { pluralize } from '@/lib/format/plural';
import { insufficientStockMessage } from './add-to-cart';
import { ProductImage } from './product-image';
import { QuantitySelector } from './quantity-selector';

function CartLine({ line }: { line: CartLineType }) {
  const setItem = useSetCartItem();
  const remove = useRemoveCartItem();
  const [error, setError] = useState<string | null>(null);
  const busy = setItem.isPending || remove.isPending;

  function change(quantity: number) {
    if (busy || quantity === line.quantity || quantity < 1) return;
    setError(null);
    setItem.mutate(
      { productId: line.productId, quantity },
      { onError: (err) => setError(insufficientStockMessage(err) ?? errorMessage(err)) },
    );
  }

  return (
    <li className="flex gap-4 py-6 sm:gap-6" aria-busy={busy || undefined}>
      <Link
        href={`/products/${line.slug}`}
        className="w-24 shrink-0 sm:w-32"
        tabIndex={-1}
        aria-hidden
      >
        <ProductImage
          image={line.image}
          alt={line.name}
          sizes="128px"
          className="rounded-control"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/products/${line.slug}`} className="font-medium text-ink hover:underline">
              {line.name}
            </Link>
            <p className="text-sm text-muted">
              <Price cents={line.unitPriceCents} /> c/u
            </p>
          </div>
          <Price cents={line.lineTotalCents} className="font-semibold text-ink" />
        </div>
        {line.warning && (
          <p className="flex items-start gap-2 text-sm text-warning" role="alert">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {line.warningMessage}
          </p>
        )}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <QuantitySelector
            value={line.quantity}
            onChange={change}
            maxPurchasable={line.maxPurchasable}
            disabled={busy}
            label={`Cantidad de ${line.name}`}
            size="sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => remove.mutate(line.productId)}
            disabled={busy}
            aria-label={`Quitar ${line.name} del carrito`}
          >
            <Trash2 aria-hidden className="size-4" /> Quitar
          </Button>
        </div>
      </div>
    </li>
  );
}

export function CartView() {
  const { data: cart, isPending, isError, refetch } = useCart();
  const clear = useClearCart();
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  if (isPending) {
    return (
      <LoadingRegion label="Cargando tu carrito…">
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </LoadingRegion>
    );
  }
  if (isError || !cart) {
    return (
      <ErrorState
        title="No pudimos cargar tu carrito"
        action={<Button onClick={() => refetch()}>Reintentar</Button>}
      />
    );
  }
  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Tu carrito está vacío"
        description="Explorá el catálogo y agregá lo que te guste."
        action={<ButtonLink href="/products">Ver productos</ButtonLink>}
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="cart-lines-heading">
        <h2 id="cart-lines-heading" className="sr-only">
          Productos en tu carrito
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {cart.items.map((line) => (
            <CartLine key={line.productId} line={line} />
          ))}
        </ul>
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            Vaciar carrito
          </Button>
        </div>
      </section>
      <aside
        aria-labelledby="cart-summary-heading"
        className="h-fit space-y-4 rounded-card border border-line bg-surface p-6 lg:sticky lg:top-28"
      >
        <h2 id="cart-summary-heading" className="font-display text-xl text-ink">
          Resumen
        </h2>
        <div className="flex justify-between text-sm">
          <span className="text-muted">
            Subtotal ({pluralize(cart.itemCount, 'unidad', 'unidades')})
          </span>
          <Price cents={cart.subtotalCents} className="font-semibold text-ink" />
        </div>
        <p className="text-xs text-muted">
          El costo de envío (si elegís envío) se suma en el paso siguiente.
        </p>
        {!cart.canCheckout && (
          <p className="text-sm text-warning" role="alert">
            Revisá los productos marcados antes de continuar.
          </p>
        )}
        {cart.canCheckout ? (
          <ButtonLink href="/checkout" size="lg" className="w-full">
            Continuar con la compra
          </ButtonLink>
        ) : (
          <Button size="lg" className="w-full" disabled>
            Continuar con la compra
          </Button>
        )}
      </aside>
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="¿Vaciar el carrito?"
        description="Se van a quitar todos los productos."
        confirmLabel="Vaciar"
        danger
        loading={clear.isPending}
        onConfirm={() =>
          clear.mutate(undefined, {
            onSuccess: () => {
              setConfirmClear(false);
              toast.show('Vaciaste el carrito.', 'info');
            },
            onError: (err) => toast.show(errorMessage(err), 'error'),
          })
        }
      />
    </div>
  );
}
