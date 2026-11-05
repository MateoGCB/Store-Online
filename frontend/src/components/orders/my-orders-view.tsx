'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useMyOrders } from '@/hooks/use-orders';
import { formatDateTime } from '@/lib/format/dates';
import { pluralize } from '@/lib/format/plural';
import { FULFILLMENT_LABELS } from '@/lib/orders/status';
import { OrderStatusBadge } from './order-status-badge';

export function MyOrdersView() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useMyOrders(page);

  if (isPending) {
    return (
      <LoadingRegion label="Cargando tus pedidos…">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </LoadingRegion>
    );
  }
  if (isError) return <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />;
  if (data.total === 0) {
    return (
      <EmptyState
        title="Todavía no hiciste pedidos"
        description="Cuando compres algo, lo vas a ver acá."
        action={<ButtonLink href="/products">Ver productos</ButtonLink>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {data.items.map((order) => (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.id}`}
              className="flex items-center gap-4 rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">Pedido #{order.number}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-sm text-muted">
                  {formatDateTime(order.createdAt)} · {FULFILLMENT_LABELS[order.fulfillment]} ·{' '}
                  {pluralize(
                    order.items.reduce((n, i) => n + i.quantity, 0),
                    'unidad',
                    'unidades',
                  )}
                </p>
              </div>
              <Price cents={order.totalCents} className="font-semibold text-ink" />
              <ChevronRight aria-hidden className="size-5 text-subtle" />
            </Link>
          </li>
        ))}
      </ul>
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onPageChange={setPage}
        label="Páginas de pedidos"
      />
    </div>
  );
}
