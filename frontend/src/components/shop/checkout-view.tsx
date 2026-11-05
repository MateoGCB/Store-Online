'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Store, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AddressForm, formatAddress } from '@/components/account/address-form';
import { Button, ButtonLink } from '@/components/ui/button';
import { Field, inputClasses } from '@/components/ui/field';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, FormError } from '@/components/ui/states';
import { MAX_ADDRESSES, useAddresses } from '@/hooks/use-addresses';
import { cartKey, useCart } from '@/hooks/use-cart';
import { ordersKey, useStoreInfo } from '@/hooks/use-orders';
import { api } from '@/lib/api/client';
import { type ApiError, errorMessage, isApiError } from '@/lib/api/errors';
import type { Fulfillment, PaymentLink } from '@/lib/api/types';
import { newIdempotencyKey } from '@/lib/idempotency';
import { goToPayment } from '@/lib/navigation';

export const NOTES_MAX = 300;

interface StockProblem {
  productId: string;
  name: string;
  requested: number;
  available: number;
}

function stockProblems(error: ApiError): StockProblem[] {
  const products = (error.details as { products?: unknown } | undefined)?.products;
  return Array.isArray(products) ? (products as StockProblem[]) : [];
}

export function CheckoutView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const cart = useCart();
  const store = useStoreInfo();
  const addresses = useAddresses();

  const [fulfillment, setFulfillment] = useState<Fulfillment>('PICKUP');
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [problems, setProblems] = useState<StockProblem[]>([]);

  // One key per purchase attempt: a double click or a network retry reuses it, so the
  // API returns the same order instead of creating two.
  const attemptKey = useRef<string | null>(null);
  const inFlight = useRef(false);

  if (cart.isPending || store.isPending || addresses.isPending) {
    return (
      <LoadingRegion label="Preparando tu compra…">
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </LoadingRegion>
    );
  }
  if (cart.isError || store.isError || addresses.isError || !cart.data || !store.data) {
    return (
      <ErrorState
        title="No pudimos preparar tu compra"
        action={<ButtonLink href="/cart">Volver al carrito</ButtonLink>}
      />
    );
  }
  if (cart.data.items.length === 0) {
    return (
      <EmptyState
        title="Tu carrito está vacío"
        description="Agregá productos para poder comprar."
        action={<ButtonLink href="/products">Ver productos</ButtonLink>}
      />
    );
  }

  const info = store.data;
  const list = addresses.data ?? [];
  const selectedAddress = fulfillment === 'DELIVERY' ? (addressId ?? list[0]?.id ?? null) : null;
  const shippingCents = fulfillment === 'DELIVERY' ? info.shippingCostCents : 0;
  // Display only: the amount charged is the total the API computes when creating the order.
  const totalCents = cart.data.subtotalCents + shippingCents;

  async function submit() {
    if (inFlight.current) return; // second click while the first request is running
    setError(null);
    setAddressError(null);
    setProblems([]);
    if (fulfillment === 'DELIVERY' && !selectedAddress) {
      setAddressError('Elegí o agregá una dirección para el envío.');
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    attemptKey.current ??= newIdempotencyKey();
    try {
      const result = await api.post<PaymentLink>(
        '/checkout',
        {
          fulfillment,
          ...(selectedAddress ? { addressId: selectedAddress } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
        { headers: { 'Idempotency-Key': attemptKey.current } },
      );
      queryClient.removeQueries({ queryKey: cartKey });
      void queryClient.invalidateQueries({ queryKey: ordersKey });
      if (result.paymentUrl) {
        goToPayment(result.paymentUrl);
      } else {
        router.push(`/account/orders/${result.order.id}`);
      }
      return; // keep the button disabled while the browser leaves
    } catch (err) {
      // A network error may have reached the server: keep the key so a retry is safe.
      if (!(isApiError(err) && err.code === 'NETWORK_ERROR')) attemptKey.current = null;
      if (isApiError(err)) {
        if (err.code === 'INSUFFICIENT_STOCK' || err.code === 'PRODUCT_UNAVAILABLE') {
          setProblems(stockProblems(err));
          setError(
            err.code === 'INSUFFICIENT_STOCK'
              ? 'Algunos productos ya no tienen stock suficiente. Ajustá tu carrito y probá de nuevo.'
              : 'Algunos productos ya no están a la venta. Sacalos del carrito para continuar.',
          );
          void queryClient.invalidateQueries({ queryKey: cartKey });
        } else if (err.code === 'CART_EMPTY') {
          router.push('/cart');
        } else if (err.code === 'ADDRESS_REQUIRED' || err.code === 'ADDRESS_NOT_FOUND') {
          setAddressError('Elegí una dirección válida para el envío.');
        } else if (err.code === 'PAYMENT_PROVIDER_ERROR' || err.status === 502) {
          setError(
            'No pudimos iniciar el pago. Tu carrito se restauró: probá de nuevo en unos minutos.',
          );
          void queryClient.invalidateQueries({ queryKey: cartKey });
        } else {
          setError(errorMessage(err));
        }
      } else {
        setError(errorMessage(err));
      }
    } finally {
      inFlight.current = false;
    }
    setSubmitting(false);
  }

  const radio =
    'flex cursor-pointer items-start gap-3 rounded-control border p-4 transition-colors has-[:checked]:border-ink has-[:checked]:bg-canvas';

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        <fieldset className="space-y-3">
          <legend className="mb-3 font-display text-xl text-ink">¿Cómo querés recibirlo?</legend>
          <label className={`${radio} border-line-strong`}>
            <input
              type="radio"
              name="fulfillment"
              value="PICKUP"
              checked={fulfillment === 'PICKUP'}
              onChange={() => setFulfillment('PICKUP')}
              className="mt-1 size-4 accent-ink"
            />
            <span className="space-y-1">
              <span className="flex items-center gap-2 font-medium text-ink">
                <Store aria-hidden className="size-4" /> Retiro en el local — sin cargo
              </span>
              <span className="block text-sm text-muted">
                {info.pickupAddress || 'Te avisamos la dirección por email.'}
              </span>
            </span>
          </label>
          <label className={`${radio} border-line-strong`}>
            <input
              type="radio"
              name="fulfillment"
              value="DELIVERY"
              checked={fulfillment === 'DELIVERY'}
              onChange={() => setFulfillment('DELIVERY')}
              className="mt-1 size-4 accent-ink"
            />
            <span className="space-y-1">
              <span className="flex items-center gap-2 font-medium text-ink">
                <Truck aria-hidden className="size-4" /> Envío a domicilio —{' '}
                <Price cents={info.shippingCostCents} />
              </span>
              <span className="block text-sm text-muted">Costo fijo a todo el país.</span>
            </span>
          </label>
        </fieldset>

        {fulfillment === 'DELIVERY' && (
          <section aria-labelledby="address-heading" className="space-y-3">
            <h2 id="address-heading" className="font-display text-xl text-ink">
              Dirección de entrega
            </h2>
            {addressError && (
              <p role="alert" className="text-sm text-danger">
                {addressError}
              </p>
            )}
            {list.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="sr-only">Elegí una dirección</legend>
                {list.map((a) => (
                  <label key={a.id} className={`${radio} border-line-strong`}>
                    <input
                      type="radio"
                      name="address"
                      value={a.id}
                      checked={selectedAddress === a.id}
                      onChange={() => setAddressId(a.id)}
                      className="mt-1 size-4 accent-ink"
                    />
                    <span className="text-sm">
                      <span className="block font-medium text-ink">{a.fullName}</span>
                      <span className="block text-muted">{formatAddress(a)}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            {addingAddress ? (
              <div className="rounded-card border border-line bg-surface p-5">
                <AddressForm
                  submitLabel="Guardar y usar esta dirección"
                  onCancel={() => setAddingAddress(false)}
                  onSaved={(address) => {
                    setAddressId(address.id);
                    setAddingAddress(false);
                    setAddressError(null);
                  }}
                />
              </div>
            ) : list.length < MAX_ADDRESSES ? (
              <Button variant="secondary" onClick={() => setAddingAddress(true)}>
                Agregar una dirección nueva
              </Button>
            ) : (
              <p className="text-sm text-muted">
                Llegaste al máximo de {MAX_ADDRESSES} direcciones guardadas.
              </p>
            )}
          </section>
        )}

        <Field
          label="Notas para el pedido"
          optional
          hint={
            <span aria-live="polite">
              {notes.length}/{NOTES_MAX} caracteres
            </span>
          }
        >
          <textarea
            rows={3}
            maxLength={NOTES_MAX}
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
            className={inputClasses}
            placeholder="Por ejemplo: horario en el que pasás a retirar."
          />
        </Field>
      </div>

      <aside
        aria-labelledby="summary-heading"
        className="h-fit space-y-4 rounded-card border border-line bg-surface p-6 lg:sticky lg:top-28"
      >
        <h2 id="summary-heading" className="font-display text-xl text-ink">
          Resumen
        </h2>
        <ul className="space-y-2 text-sm">
          {cart.data.items.map((line) => (
            <li key={line.productId} className="flex justify-between gap-3">
              <span className={line.warning ? 'text-subtle line-through' : 'text-muted'}>
                {line.quantity} × {line.name}
              </span>
              {line.warning ? (
                // Not counted in the server subtotal until the cart is fixed.
                <span className="text-danger">
                  {line.warning === 'UNAVAILABLE'
                    ? 'No disponible'
                    : line.warning === 'OUT_OF_STOCK'
                      ? 'Sin stock'
                      : 'Stock insuficiente'}
                </span>
              ) : (
                <Price cents={line.lineTotalCents} className="text-ink" />
              )}
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>
              <Price cents={cart.data.subtotalCents} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Envío</dt>
            <dd>{shippingCents === 0 ? 'Sin cargo' : <Price cents={shippingCents} />}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-ink">
            <dt>Total</dt>
            <dd>
              <Price cents={totalCents} />
            </dd>
          </div>
        </dl>

        <FormError message={error} />
        {problems.length > 0 && (
          <ul className="space-y-1 text-sm text-danger" aria-label="Productos sin stock suficiente">
            {problems.map((p) => (
              <li key={p.productId} className="flex items-start gap-2">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  {p.name}: pediste {p.requested},{' '}
                  {p.available === 0 ? 'no queda stock' : `quedan ${p.available}`}.
                </span>
              </li>
            ))}
          </ul>
        )}
        {problems.length > 0 && (
          <Link href="/cart" className="block text-sm font-medium text-accent hover:underline">
            Volver al carrito
          </Link>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={submit}
          loading={submitting}
          disabled={!cart.data.canCheckout}
        >
          Ir a pagar
        </Button>
        <p className="text-xs text-muted">
          Reservamos tus productos mientras completás el pago. El total final lo confirma la tienda
          al crear el pedido.
        </p>
      </aside>
    </div>
  );
}
