'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, inputClasses } from '@/components/ui/field';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { FormError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAdjustStock, useStockMovements } from '@/hooks/use-admin';
import { errorMessage, isApiError } from '@/lib/api/errors';
import type { AdminProduct, StockMovement } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format/dates';
import { pluralize } from '@/lib/format/plural';

export const STOCK_REASON_LABELS: Record<StockMovement['reason'], string> = {
  INITIAL: 'Stock inicial',
  SALE: 'Venta',
  ADMIN_ADJUSTMENT: 'Ajuste manual',
  CANCEL_RESTOCK: 'Devolución por cancelación',
  LATE_PAYMENT: 'Venta con pago tardío',
};

const schema = z.object({
  delta: z
    .string()
    .regex(/^-?\d{1,6}$/, 'Ingresá un número entero (negativo para restar).')
    .refine((v) => Number(v) !== 0, 'El ajuste no puede ser 0.')
    .refine((v) => Math.abs(Number(v)) <= 100_000, 'Máximo 100.000 unidades.'),
  note: z.string().trim().min(1, 'Contá el motivo del ajuste.').max(200, 'Máximo 200 caracteres.'),
});

export function StockPanel({ product }: { product: AdminProduct }) {
  const adjust = useAdjustStock(product.id);
  const movements = useStockMovements(product.id);
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { delta: '', note: '' },
  });

  const onSubmit = handleSubmit((values) => {
    if (adjust.isPending) return;
    setFormError(null);
    adjust.mutate(
      { delta: Number(values.delta), note: values.note },
      {
        onSuccess: (p) => {
          toast.show(`Stock actualizado: ${pluralize(p.stock, 'unidad', 'unidades')}.`);
          reset();
        },
        onError: (err) =>
          setFormError(
            isApiError(err) && err.code === 'STOCK_BELOW_RESERVED'
              ? `No podés dejar menos stock que lo reservado por pedidos pendientes (${pluralize(product.reserved, 'unidad', 'unidades')}).`
              : errorMessage(err),
          ),
      },
    );
  });

  return (
    <section
      aria-labelledby="stock-heading"
      className="space-y-5 rounded-card border border-line bg-surface p-6"
    >
      <h2 id="stock-heading" className="font-display text-xl text-ink">
        Stock
      </h2>
      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          ['En stock', product.stock],
          ['Reservadas', product.reserved],
          ['Disponibles', product.available],
        ].map(([label, value]) => (
          <div key={label} className="rounded-control border border-line px-2 py-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-xl font-semibold text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {!product.archivedAt && (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError message={formError} />
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <Field label="Ajuste" error={errors.delta?.message} hint="Ej.: 10 o -2">
              <input inputMode="numeric" className={inputClasses} {...register('delta')} />
            </Field>
            <Field label="Motivo" error={errors.note?.message}>
              <input
                className={inputClasses}
                placeholder="Reposición, rotura, conteo…"
                {...register('note')}
              />
            </Field>
          </div>
          <Button type="submit" variant="secondary" loading={adjust.isPending}>
            Ajustar stock
          </Button>
        </form>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Historial de movimientos</h3>
        {movements.isPending ? (
          <LoadingRegion label="Cargando movimientos…">
            <Skeleton className="h-24 w-full" />
          </LoadingRegion>
        ) : movements.isError ? (
          <p className="text-sm text-danger">No pudimos cargar el historial.</p>
        ) : movements.data.length === 0 ? (
          <p className="text-sm text-muted">Sin movimientos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-3">
                    Fecha
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Motivo
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Cambio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {movements.data.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-3 whitespace-nowrap text-muted">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="py-2 pr-3">
                      {STOCK_REASON_LABELS[m.reason]}
                      {m.note && <span className="block text-xs text-muted">{m.note}</span>}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-medium tabular-nums ${m.delta < 0 ? 'text-danger' : 'text-success'}`}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
