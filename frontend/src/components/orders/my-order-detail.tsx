'use client';

import { Clock, MapPin, Store } from 'lucide-react';
import { useState } from 'react';
import { formatAddress } from '@/components/account/address-form';
import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ErrorState, FormError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useCancelMyOrder, useMyOrder, usePayMyOrder, useStoreInfo } from '@/hooks/use-orders';
import { errorMessage, isApiError } from '@/lib/api/errors';
import { formatDateTime, formatTime } from '@/lib/format/dates';
import { goToPayment } from '@/lib/navigation';
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_DESCRIPTIONS,
  PAYMENT_STATUS_LABELS,
  canCustomerPayOrCancel,
} from '@/lib/orders/status';
import { OrderStatusBadge } from './order-status-badge';
import { OrderItems } from './order-summary';

export function MyOrderDetail({ id }: { id: string }) {
  const { data: order, isPending, isError, error, refetch } = useMyOrder(id);
  const store = useStoreInfo();
  const pay = usePayMyOrder();
  const cancel = useCancelMyOrder();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isPending) {
    return (
      <LoadingRegion label="Cargando el pedido…">
        <Skeleton className="h-64 w-full" />
      </LoadingRegion>
    );
  }
  if (isError) {
    if (isApiError(error) && error.status === 404) {
      return (
        <ErrorState
          title="No encontramos ese pedido"
          description="Revisá el enlace o buscalo en Mis pedidos."
          action={<ButtonLink href="/account/orders">Ir a mis pedidos</ButtonLink>}
        />
      );
    }
    return <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />;
  }

  const pending = canCustomerPayOrCancel(order.status);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Pedido #{order.number}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-muted">{ORDER_STATUS_DESCRIPTIONS[order.status]}</p>
        <p className="text-sm text-subtle">Hecho el {formatDateTime(order.createdAt)}</p>
      </header>

      {pending && (
        <section
          className="space-y-4 rounded-card border border-warning/30 bg-warning-soft p-5"
          aria-labelledby="pending-heading"
        >
          <h2 id="pending-heading" className="flex items-center gap-2 font-medium text-warning">
            <Clock aria-hidden className="size-5" />
            Reservamos tus productos hasta las {formatTime(order.expiresAt)}
          </h2>
          <p className="text-sm text-ink">
            Si no completás el pago antes, el pedido vence y los productos vuelven a estar
            disponibles.
          </p>
          {order.payment?.status === 'REJECTED' && (
            <p className="text-sm font-medium text-danger">
              El último intento de pago fue rechazado. Podés intentar de nuevo.
            </p>
          )}
          <FormError message={actionError} />
          <div className="flex flex-wrap gap-3">
            <Button
              loading={pay.isPending}
              disabled={cancel.isPending}
              onClick={() => {
                setActionError(null);
                pay.mutate(order.id, {
                  onSuccess: (link) => {
                    if (link.paymentUrl) goToPayment(link.paymentUrl);
                  },
                  onError: (err) => {
                    setActionError(errorMessage(err));
                    void refetch();
                  },
                });
              }}
            >
              Pagar ahora
            </Button>
            <Button
              variant="secondary"
              disabled={pay.isPending}
              onClick={() => setConfirmCancel(true)}
            >
              Cancelar pedido
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="items-heading" className="space-y-3">
          <h2 id="items-heading" className="font-display text-xl text-ink">
            Productos
          </h2>
          <OrderItems order={order} />
        </section>
        <aside className="space-y-6 text-sm">
          <section aria-labelledby="delivery-heading" className="space-y-2">
            <h2 id="delivery-heading" className="font-display text-xl text-ink">
              Entrega
            </h2>
            <p className="flex items-center gap-2 font-medium text-ink">
              {order.fulfillment === 'PICKUP' ? (
                <Store aria-hidden className="size-4" />
              ) : (
                <MapPin aria-hidden className="size-4" />
              )}
              {FULFILLMENT_LABELS[order.fulfillment]}
            </p>
            {order.fulfillment === 'PICKUP' ? (
              <p className="text-muted">{store.data?.pickupAddress}</p>
            ) : (
              order.shippingAddress && (
                <div className="text-muted">
                  <p>{order.shippingAddress.fullName}</p>
                  <p>
                    {formatAddress({
                      street: order.shippingAddress.street ?? '',
                      number: order.shippingAddress.number ?? '',
                      floorApt: order.shippingAddress.floorApt ?? null,
                      city: order.shippingAddress.city ?? '',
                      province: order.shippingAddress.province ?? '',
                      postalCode: order.shippingAddress.postalCode ?? '',
                    })}
                  </p>
                  <p>Tel.: {order.shippingAddress.phone}</p>
                </div>
              )
            )}
          </section>
          {order.payment && (
            <section aria-labelledby="payment-heading" className="space-y-1">
              <h2 id="payment-heading" className="font-display text-xl text-ink">
                Pago
              </h2>
              <p className="text-muted">Estado: {PAYMENT_STATUS_LABELS[order.payment.status]}</p>
              {order.paidAt && (
                <p className="text-muted">Pagado el {formatDateTime(order.paidAt)}</p>
              )}
            </section>
          )}
          {order.notes && (
            <section aria-labelledby="notes-heading" className="space-y-1">
              <h2 id="notes-heading" className="font-display text-xl text-ink">
                Notas
              </h2>
              <p className="whitespace-pre-line text-muted">{order.notes}</p>
            </section>
          )}
          {order.cancelledAt && (
            <p className="text-muted">Cancelado el {formatDateTime(order.cancelledAt)}.</p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="¿Cancelar el pedido?"
        description="Los productos reservados vuelven a estar disponibles. No se puede deshacer."
        confirmLabel="Sí, cancelar pedido"
        cancelLabel="No, volver"
        danger
        loading={cancel.isPending}
        onConfirm={() =>
          cancel.mutate(order.id, {
            onSuccess: () => {
              setConfirmCancel(false);
              toast.show('Cancelaste el pedido.', 'info');
            },
            onError: (err) => {
              setConfirmCancel(false);
              setActionError(errorMessage(err));
              void refetch();
            },
          })
        }
      />
    </div>
  );
}
