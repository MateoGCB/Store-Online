'use client';

import { ShoppingBag } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useCart, useSetCartItem } from '@/hooks/use-cart';
import { useSession } from '@/hooks/use-session';
import { isApiError, errorMessage } from '@/lib/api/errors';
import type { PublicProduct } from '@/lib/api/types';
import { loginUrl } from '@/lib/auth/next-param';
import { MAX_UNITS_PER_PRODUCT, QuantitySelector, clampQuantity } from './quantity-selector';

/** Message for a 409 INSUFFICIENT_STOCK with the available quantity from the API. */
export function insufficientStockMessage(error: unknown): string | null {
  if (!isApiError(error) || error.code !== 'INSUFFICIENT_STOCK') return null;
  const available = (error.details as { available?: unknown } | undefined)?.available;
  if (typeof available !== 'number') return error.message;
  if (available === 0) return 'Ya no quedan unidades disponibles de este producto.';
  return available === 1
    ? 'Solo queda 1 unidad disponible.'
    : `Solo quedan ${available} unidades disponibles.`;
}

export function AddToCart({
  product,
}: {
  product: Pick<PublicProduct, 'id' | 'name' | 'maxPurchasable' | 'inStock'>;
}) {
  const { user, isLoading } = useSession();
  const { data: cart } = useCart();
  const setItem = useSetCartItem();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [quantity, setQuantity] = useState(() => clampQuantity(1, product.maxPurchasable));
  const [error, setError] = useState<string | null>(null);

  const soldOut = !product.inStock || product.maxPurchasable <= 0;

  function add() {
    if (setItem.isPending) return; // no double submit
    if (!user) {
      router.push(loginUrl(pathname));
      return;
    }
    setError(null);
    const inCart = cart?.items.find((i) => i.productId === product.id)?.quantity ?? 0;
    const target = Math.min(inCart + quantity, MAX_UNITS_PER_PRODUCT);
    setItem.mutate(
      { productId: product.id, quantity: target },
      {
        onSuccess: () => {
          toast.show(
            quantity === 1
              ? `Agregaste ${product.name} al carrito.`
              : `Agregaste ${quantity} unidades de ${product.name} al carrito.`,
          );
        },
        onError: (err) => setError(insufficientStockMessage(err) ?? errorMessage(err)),
      },
    );
  }

  if (soldOut) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-danger">Sin stock</p>
        <Button size="lg" disabled className="w-full sm:w-auto">
          Sin stock
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <QuantitySelector
        value={quantity}
        onChange={setQuantity}
        maxPurchasable={product.maxPurchasable}
      />
      <FormError message={error} />
      <Button
        size="lg"
        onClick={add}
        loading={setItem.isPending}
        disabled={isLoading}
        className="w-full sm:w-auto"
      >
        <ShoppingBag aria-hidden className="size-5" />
        Agregar al carrito
      </Button>
      {!isLoading && !user && (
        <p className="text-xs text-muted">Para comprar tenés que ingresar con tu cuenta.</p>
      )}
    </div>
  );
}
