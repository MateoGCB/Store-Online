'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { useAdminStats } from '@/hooks/use-admin';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/orders/status';
import { AdminPageHeader } from './page-header';

export function StatsView() {
  const { data, isPending, isError, refetch } = useAdminStats();

  return (
    <>
      <AdminPageHeader title="Resumen" description="Cómo viene la tienda." />
      {isPending ? (
        <LoadingRegion label="Cargando estadísticas…">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-card" />
            ))}
          </div>
        </LoadingRegion>
      ) : isError ? (
        <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-line bg-surface p-5">
              <p className="text-sm text-muted">Ventas de los últimos 30 días</p>
              <Price
                cents={data.last30Days.salesCents}
                className="mt-2 block font-display text-3xl text-ink"
              />
            </div>
            <div className="rounded-card border border-line bg-surface p-5">
              <p className="text-sm text-muted">Pedidos pagados (30 días)</p>
              <p className="mt-2 font-display text-3xl text-ink">{data.last30Days.paidOrders}</p>
            </div>
            <Link
              href="/admin/orders?needsAttention=true"
              className={`rounded-card border p-5 transition-colors ${
                data.ordersNeedingAttention > 0
                  ? 'border-warning/40 bg-warning-soft hover:border-warning'
                  : 'border-line bg-surface hover:border-line-strong'
              }`}
            >
              <p className="flex items-center gap-2 text-sm text-muted">
                {data.ordersNeedingAttention > 0 && (
                  <AlertTriangle aria-hidden className="size-4 text-warning" />
                )}
                Pedidos que necesitan atención
              </p>
              <p className="mt-2 font-display text-3xl text-ink">{data.ordersNeedingAttention}</p>
            </Link>
          </div>

          <section
            aria-labelledby="by-status"
            className="rounded-card border border-line bg-surface p-5"
          >
            <h2 id="by-status" className="font-display text-xl text-ink">
              Pedidos por estado
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ORDER_STATUSES.map((s) => (
                <li key={s}>
                  <Link
                    href={`/admin/orders?status=${s}`}
                    className="block rounded-control border border-line px-3 py-2.5 hover:border-line-strong"
                  >
                    <span className="block text-xs text-muted">{ORDER_STATUS_LABELS[s]}</span>
                    <span className="text-lg font-semibold text-ink">
                      {data.ordersByStatus[s] ?? 0}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="low-stock"
            className="rounded-card border border-line bg-surface p-5"
          >
            <h2 id="low-stock" className="font-display text-xl text-ink">
              Stock bajo (hasta {data.lowStockThreshold} unidades)
            </h2>
            {data.lowStockProducts.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No hay productos con stock bajo.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {data.lowStockProducts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="flex items-center gap-2">
                      {!p.active && <Badge>Inactivo</Badge>}
                      <Badge tone={p.stock === 0 ? 'danger' : 'warning'}>
                        {p.stock} en stock{p.reserved > 0 ? ` · ${p.reserved} reservadas` : ''}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
