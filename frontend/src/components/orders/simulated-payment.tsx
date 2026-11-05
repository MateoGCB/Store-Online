'use client';

import { FlaskConical } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ErrorState, FormError } from '@/components/ui/states';
import { useMyOrder } from '@/hooks/use-orders';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import type { Order } from '@/lib/api/types';
import { OrderItems } from './order-summary';

/** Demo mode only: plays the role of the Mercado Pago checkout. */
export function SimulatedPayment() {
  const orderId = useSearchParams().get('orderId') ?? '';
  const router = useRouter();
  const { data: order, isPending, isError } = useMyOrder(orderId);
  const [sending, setSending] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function simulate(outcome: 'approved' | 'rejected') {
    if (sending) return;
    setSending(outcome);
    setError(null);
    try {
      await api.post<Order>(`/dev/orders/${orderId}/simulate-payment`, { outcome });
      router.push(
        `/checkout/result?orderId=${orderId}&payment=${outcome === 'approved' ? 'success' : 'failure'}`,
      );
    } catch (err) {
      setError(errorMessage(err));
      setSending(null);
    }
  }

  if (isPending) {
    return (
      <LoadingRegion label="Cargando el pedido…">
        <Skeleton className="h-64 w-full" />
      </LoadingRegion>
    );
  }
  if (isError || !order) {
    return (
      <ErrorState
        title="No encontramos el pedido"
        action={<ButtonLink href="/account/orders">Ir a mis pedidos</ButtonLink>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start gap-3 rounded-card border border-info/30 bg-info-soft p-4 text-sm text-info">
        <FlaskConical aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p>
          <strong>Modo demo:</strong> los pagos son simulados. No se cobra nada ni se usa Mercado
          Pago.
        </p>
      </div>
      <h1 className="font-display text-3xl text-ink">Pago simulado del pedido #{order.number}</h1>
      <p className="text-muted">
        Total a pagar: <Price cents={order.totalCents} className="font-semibold text-ink" />
      </p>
      <OrderItems order={order} />
      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => simulate('approved')}
          loading={sending === 'approved'}
          disabled={!!sending}
        >
          Simular pago aprobado
        </Button>
        <Button
          variant="secondary"
          onClick={() => simulate('rejected')}
          loading={sending === 'rejected'}
          disabled={!!sending}
        >
          Simular pago rechazado
        </Button>
      </div>
    </div>
  );
}
