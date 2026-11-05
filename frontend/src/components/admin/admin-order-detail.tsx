'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { formatAddress } from '@/components/account/address-form';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { OrderItems } from '@/components/orders/order-summary';
import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, inputClasses } from '@/components/ui/field';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ErrorState, FormError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import {
  useAdminOrder,
  useCancelOrder,
  useChangeOrderStatus,
  useResolveAttention,
} from '@/hooks/use-admin';
import { errorMessage, isApiError } from '@/lib/api/errors';
import type { AdminOrder } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format/dates';
import {
  FULFILLMENT_LABELS,
  PAYMENT_STATUS_LABELS,
  availableTransitions,
  canAdminCancel,
} from '@/lib/orders/status';
import { AdminPageHeader } from './page-header';

export const CONCURRENT_CHANGE_MESSAGE = 'El pedido cambió, actualizamos los datos.';

/** Buttons for the valid transitions ONLY (from lib/orders), plus cancel when allowed. */
export function OrderActions({ order, onRefetch }: { order: AdminOrder; onRefetch: () => void }) {
  const change = useChangeOrderStatus(order.id);
  const cancel = useCancelOrder(order.id);
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const transitions = availableTransitions(order.status, order.fulfillment);
  const cancellable = canAdminCancel(order.status);
  const busy = change.isPending || cancel.isPending;

  function handleError(err: unknown) {
    if (
      isApiError(err) &&
      (err.code === 'ORDER_STATUS_CHANGED' ||
        err.code === 'INVALID_STATUS_TRANSITION' ||
        err.status === 409)
    ) {
      setError(CONCURRENT_CHANGE_MESSAGE);
      onRefetch();
      return;
    }
    setError(errorMessage(err));
  }

  if (transitions.length === 0 && !cancellable) {
    return <p className="text-sm text-muted">No hay acciones disponibles para este estado.</p>;
  }

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        {transitions.map((t) => (
          <Button
            key={t.to}
            loading={change.isPending && change.variables?.status === t.to}
            disabled={busy}
            onClick={() => {
              setError(null);
              change.mutate(
                { status: t.to, fromStatus: order.status },
                {
                  onSuccess: () => toast.show('Actualizamos el estado del pedido.'),
                  onError: handleError,
                },
              );
            }}
          >
            {t.label}
          </Button>
        ))}
        {cancellable && (
          <Button variant="danger" disabled={busy} onClick={() => setCancelOpen(true)}>
            Cancelar pedido
          </Button>
        )}
      </div>
      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancelar el pedido #${order.number}`}
        description="Las unidades vuelven al stock y el pedido queda marcado para que reembolses el pago a mano."
      >
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const value = reason.trim();
            if (!value) return setReasonError('Contá el motivo de la cancelación.');
            if (value.length > 300) return setReasonError('Máximo 300 caracteres.');
            cancel.mutate(value, {
              onSuccess: () => {
                setCancelOpen(false);
                setReason('');
                toast.show('Cancelamos el pedido.', 'info');
              },
              onError: (err) => {
                setCancelOpen(false);
                handleError(err);
              },
            });
          }}
        >
          <Field label="Motivo" error={reasonError ?? undefined}>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClasses}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setCancelOpen(false)}
              disabled={cancel.isPending}
            >
              Volver
            </Button>
            <Button type="submit" variant="danger" loading={cancel.isPending}>
              Confirmar cancelación
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function AdminOrderDetail({ id }: { id: string }) {
  const { data: order, isPending, isError, error, refetch } = useAdminOrder(id);
  const resolve = useResolveAttention(id);
  const toast = useToast();

  if (isPending) {
    return (
      <LoadingRegion label="Cargando pedido…">
        <Skeleton className="h-96 w-full" />
      </LoadingRegion>
    );
  }
  if (isError) {
    return isApiError(error) && error.status === 404 ? (
      <ErrorState
        title="No encontramos ese pedido"
        action={<ButtonLink href="/admin/orders">Volver a pedidos</ButtonLink>}
      />
    ) : (
      <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />
    );
  }

  const timeline = [
    { label: 'Creado', at: order.createdAt },
    order.paidAt ? { label: 'Pagado', at: order.paidAt } : null,
    order.cancelledAt ? { label: 'Cancelado', at: order.cancelledAt } : null,
  ].filter((x): x is { label: string; at: string } => x !== null);

  return (
    <>
      <AdminPageHeader
        title={`Pedido #${order.number}`}
        description={formatDateTime(order.createdAt)}
        actions={<OrderStatusBadge status={order.status} />}
      />
      {order.needsAttention && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-start gap-3 rounded-card border border-warning/40 bg-warning-soft p-5"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium text-warning">Este pedido necesita atención</p>
            <p className="text-sm text-ink">
              {order.attentionNote ?? 'Revisá los pagos de este pedido.'}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={resolve.isPending}
            onClick={() =>
              resolve.mutate(undefined, {
                onSuccess: () => toast.show('Marcamos el pedido como resuelto.'),
                onError: (err) => toast.show(errorMessage(err), 'error'),
              })
            }
          >
            <CheckCircle2 aria-hidden className="size-4" /> Marcar como resuelto
          </Button>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section
            aria-labelledby="actions-heading"
            className="space-y-3 rounded-card border border-line bg-surface p-5"
          >
            <h2 id="actions-heading" className="font-display text-xl text-ink">
              Acciones
            </h2>
            <OrderActions order={order} onRefetch={() => void refetch()} />
          </section>
          <section aria-labelledby="admin-items-heading" className="space-y-3">
            <h2 id="admin-items-heading" className="font-display text-xl text-ink">
              Productos
            </h2>
            <OrderItems order={order} />
          </section>
        </div>
        <aside className="space-y-6 text-sm">
          <section
            aria-labelledby="customer-heading"
            className="space-y-1 rounded-card border border-line bg-surface p-5"
          >
            <h2 id="customer-heading" className="mb-2 font-display text-lg text-ink">
              Cliente
            </h2>
            <p className="font-medium text-ink">{order.customer.name}</p>
            <p className="text-muted">{order.customer.email}</p>
          </section>
          <section
            aria-labelledby="delivery-admin-heading"
            className="space-y-1 rounded-card border border-line bg-surface p-5"
          >
            <h2 id="delivery-admin-heading" className="mb-2 font-display text-lg text-ink">
              {FULFILLMENT_LABELS[order.fulfillment]}
            </h2>
            {order.shippingAddress ? (
              <>
                <p className="text-ink">{order.shippingAddress.fullName}</p>
                <p className="text-muted">{formatAddress(order.shippingAddress)}</p>
                <p className="text-muted">Tel.: {order.shippingAddress.phone}</p>
                {order.shippingAddress.notes && (
                  <p className="text-muted italic">{order.shippingAddress.notes}</p>
                )}
              </>
            ) : (
              <p className="text-muted">El cliente retira en el local.</p>
            )}
            {order.notes && (
              <p className="mt-2 border-t border-line pt-2 whitespace-pre-line text-muted">
                Notas: {order.notes}
              </p>
            )}
          </section>
          <section
            aria-labelledby="history-heading"
            className="space-y-2 rounded-card border border-line bg-surface p-5"
          >
            <h2 id="history-heading" className="mb-2 font-display text-lg text-ink">
              Historial
            </h2>
            <ol className="space-y-1.5">
              {timeline.map((t) => (
                <li key={t.label} className="flex justify-between gap-3">
                  <span className="text-ink">{t.label}</span>
                  <span className="text-muted">{formatDateTime(t.at)}</span>
                </li>
              ))}
            </ol>
            {order.cancelReason && (
              <p className="text-muted">Motivo de cancelación: {order.cancelReason}</p>
            )}
          </section>
          <section
            aria-labelledby="payments-heading"
            className="space-y-2 rounded-card border border-line bg-surface p-5"
          >
            <h2 id="payments-heading" className="mb-2 font-display text-lg text-ink">
              Pagos
            </h2>
            {order.payments.length === 0 ? (
              <p className="text-muted">Sin pagos registrados.</p>
            ) : (
              <ul className="space-y-2">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span>
                      {PAYMENT_STATUS_LABELS[p.status]}
                      <span className="block text-xs text-muted">
                        {p.providerPaymentId ? `N.º ${p.providerPaymentId}` : 'Sin número'} ·{' '}
                        {formatDateTime(p.updatedAt)}
                      </span>
                    </span>
                    <Price cents={p.amountCents} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
