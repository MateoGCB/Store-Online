'use client';

import { AlertTriangle } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Button } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/field';
import { Pagination } from '@/components/ui/pagination';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { type OrderListParams, useAdminOrders } from '@/hooks/use-admin';
import type { OrderStatus } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format/dates';
import { FULFILLMENT_LABELS, ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/orders/status';
import { AdminPageHeader } from './page-header';
import { RowLink, linkRowClass } from './row-link';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fromUrl(search: URLSearchParams): OrderListParams {
  const status = search.get('status') ?? '';
  const page = Number(search.get('page'));
  return {
    status: (ORDER_STATUSES as readonly string[]).includes(status) ? (status as OrderStatus) : '',
    number: /^\d{1,9}$/.test(search.get('number') ?? '') ? search.get('number')! : '',
    from: DATE.test(search.get('from') ?? '') ? search.get('from')! : '',
    to: DATE.test(search.get('to') ?? '') ? search.get('to')! : '',
    needsAttention: search.get('needsAttention') === 'true',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function toUrl(params: OrderListParams): string {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.number) q.set('number', params.number);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.needsAttention) q.set('needsAttention', 'true');
  if (params.page > 1) q.set('page', String(params.page));
  return q.toString();
}

/** Filters are kept in the URL so the list can be shared and "back" restores it. */
export function OrdersTable() {
  const search = useSearchParams();
  // Remount when the URL changes so the filter form shows the URL values.
  return <OrdersTableView key={search.toString()} params={fromUrl(search)} />;
}

function OrdersTableView({ params }: { params: OrderListParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState(params);
  const { data, isPending, isError, refetch, isFetching } = useAdminOrders(params);

  function apply(next: OrderListParams) {
    const qs = toUrl(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <AdminPageHeader title="Pedidos" />
      <form
        className="mb-6 grid gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_10rem_10rem_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ ...draft, page: 1 });
        }}
      >
        <div>
          <label htmlFor="orders-status" className="mb-1.5 block text-sm font-medium text-ink">
            Estado
          </label>
          <select
            id="orders-status"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as OrderStatus | '' })}
            className={inputClasses}
          >
            <option value="">Todos</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="orders-number" className="mb-1.5 block text-sm font-medium text-ink">
            Número
          </label>
          <input
            id="orders-number"
            inputMode="numeric"
            value={draft.number}
            onChange={(e) => setDraft({ ...draft, number: e.target.value.replace(/\D/g, '') })}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="orders-from" className="mb-1.5 block text-sm font-medium text-ink">
            Desde
          </label>
          <input
            id="orders-from"
            type="date"
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="orders-to" className="mb-1.5 block text-sm font-medium text-ink">
            Hasta
          </label>
          <input
            id="orders-to"
            type="date"
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-1">
          <label className="flex items-center gap-2 text-sm whitespace-nowrap text-ink">
            <input
              type="checkbox"
              checked={draft.needsAttention}
              onChange={(e) => setDraft({ ...draft, needsAttention: e.target.checked })}
              className="size-4 accent-ink"
            />
            Necesitan atención
          </label>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </div>
      </form>

      {isPending ? (
        <LoadingRegion label="Cargando pedidos…">
          <Skeleton className="h-96 w-full" />
        </LoadingRegion>
      ) : isError ? (
        <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No hay pedidos con esos filtros" />
      ) : (
        <div className="space-y-6" aria-busy={isFetching || undefined}>
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">Pedidos ({data.total})</caption>
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Pedido
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Entrega
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((o) => (
                  <tr
                    key={o.id}
                    className={`${linkRowClass} ${
                      o.needsAttention
                        ? 'bg-warning-soft/60 focus-within:bg-warning-soft hover:bg-warning-soft'
                        : 'focus-within:bg-canvas hover:bg-canvas'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <RowLink href={`/admin/orders/${o.id}`}>#{o.number}</RowLink>
                      <span className="block text-xs text-muted">
                        {formatDateTime(o.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {o.customer.name}
                      <span className="block text-xs text-muted">{o.customer.email}</span>
                    </td>
                    <td className="px-4 py-3">{FULFILLMENT_LABELS[o.fulfillment]}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <OrderStatusBadge status={o.status} />
                        {o.needsAttention && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                            <AlertTriangle aria-hidden className="size-3.5" /> Atención
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Price cents={o.totalCents} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(page) => apply({ ...params, page })}
            label="Páginas de pedidos"
          />
        </div>
      )}
    </>
  );
}
