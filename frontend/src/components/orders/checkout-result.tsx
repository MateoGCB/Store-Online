'use client';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { cartKey } from '@/hooks/use-cart';
import { orderKey } from '@/hooks/use-orders';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import type { Order } from '@/lib/api/types';

export const POLL_INTERVAL_MS = 3000;
export const MAX_POLLS = 10;

type Outcome = 'paid' | 'pending' | 'rejected' | 'expired' | 'cancelled';

export function outcomeOf(order: Order): Outcome {
  if (order.status === 'EXPIRED') return 'expired';
  if (order.status === 'CANCELLED') return 'cancelled';
  if (order.status !== 'PENDING_PAYMENT') return 'paid';
  return order.payment?.status === 'REJECTED' ? 'rejected' : 'pending';
}

/**
 * Back from Mercado Pago (or the demo payment page): asks the API for the real payment state
 * (POST /orders/:id/sync) and, while it is still pending, retries every few seconds.
 */
export function CheckoutResult() {
  const orderId = useSearchParams().get('orderId') ?? '';
  const queryClient = useQueryClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return;
    let cancelled = false;
    async function sync() {
      try {
        const result = await api.post<Order>(`/orders/${orderId}/sync`);
        if (cancelled) return;
        setOrder(result);
        queryClient.setQueryData(orderKey(orderId), result);
        void queryClient.invalidateQueries({ queryKey: cartKey });
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    }
    if (polls === 0 || (order && outcomeOf(order) === 'pending' && polls < MAX_POLLS)) {
      timer.current = window.setTimeout(
        () => {
          void sync().then(() => !cancelled && setPolls((p) => p + 1));
        },
        polls === 0 ? 0 : POLL_INTERVAL_MS,
      );
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
    };
    // `order` changes after each sync and schedules the next one.
  }, [orderId, polls, order, queryClient]);

  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return (
      <ErrorState
        title="No encontramos el pedido"
        description="Volvé a Mis pedidos para revisarlo."
        action={<ButtonLink href="/account/orders">Ir a mis pedidos</ButtonLink>}
      />
    );
  }
  if (error && !order) {
    return (
      <ErrorState
        title="No pudimos consultar el pago"
        description={error}
        action={<ButtonLink href={`/account/orders/${orderId}`}>Revisar mi pedido</ButtonLink>}
      />
    );
  }
  if (!order) {
    return (
      <LoadingRegion label="Consultando el estado del pago…">
        <Skeleton className="h-56 w-full" />
      </LoadingRegion>
    );
  }

  const outcome = outcomeOf(order);
  const gaveUp = outcome === 'pending' && polls >= MAX_POLLS;
  const view = {
    paid: {
      icon: <CheckCircle2 aria-hidden className="size-12 text-success" />,
      title: '¡Listo! Recibimos tu pago',
      text: 'Ya estamos con tu pedido. Te mostramos el detalle en Mis pedidos.',
    },
    pending: {
      icon: <Clock aria-hidden className="size-12 text-warning" />,
      title: 'Estamos esperando la confirmación del pago',
      text: gaveUp
        ? 'Todavía no nos llegó la confirmación. Puede tardar unos minutos: revisá tu pedido más tarde.'
        : 'Esto puede tardar unos segundos…',
    },
    rejected: {
      icon: <XCircle aria-hidden className="size-12 text-danger" />,
      title: 'El pago fue rechazado',
      text: 'Tus productos siguen reservados por un rato. Podés intentar pagar de nuevo desde tu pedido.',
    },
    expired: {
      icon: <XCircle aria-hidden className="size-12 text-subtle" />,
      title: 'El pedido venció',
      text: 'Se terminó el tiempo para pagar y liberamos los productos. Si te cobraron, lo revisamos y te devolvemos el dinero.',
    },
    cancelled: {
      icon: <XCircle aria-hidden className="size-12 text-subtle" />,
      title: 'El pedido está cancelado',
      text: 'Si tenés dudas, escribinos.',
    },
  }[outcome];

  return (
    <div
      className="mx-auto max-w-xl rounded-card border border-line bg-surface p-8 text-center shadow-card"
      aria-live="polite"
    >
      <div className="flex justify-center">{view.icon}</div>
      <h1 className="mt-4 font-display text-3xl text-ink">{view.title}</h1>
      <p className="mt-3 text-muted">{view.text}</p>
      <p className="mt-4 text-sm text-ink">
        Pedido #{order.number} · Total <Price cents={order.totalCents} className="font-semibold" />
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={`/account/orders/${order.id}`}>Revisar mi pedido</ButtonLink>
        {outcome !== 'pending' && (
          <ButtonLink href="/products" variant="secondary">
            Seguir comprando
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
