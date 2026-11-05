'use client';

import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { MAX_ADDRESSES, useAddresses, useDeleteAddress } from '@/hooks/use-addresses';
import { errorMessage } from '@/lib/api/errors';
import type { Address } from '@/lib/api/types';
import { AddressForm, formatAddress } from './address-form';

export function AddressesView() {
  const { data, isPending, isError, refetch } = useAddresses();
  const remove = useDeleteAddress();
  const toast = useToast();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Address | null>(null);

  if (isPending) {
    return (
      <LoadingRegion label="Cargando direcciones…">
        <Skeleton className="h-28 w-full" />
      </LoadingRegion>
    );
  }
  if (isError) {
    return <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />;
  }

  const atLimit = data.length >= MAX_ADDRESSES;

  return (
    <div className="space-y-6">
      {editing ? (
        <section
          className="rounded-card border border-line bg-surface p-6"
          aria-labelledby="address-form-heading"
        >
          <h2 id="address-form-heading" className="mb-4 font-display text-xl text-ink">
            {editing === 'new' ? 'Nueva dirección' : 'Editar dirección'}
          </h2>
          <AddressForm
            address={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              toast.show(
                editing === 'new' ? 'Guardamos la dirección.' : 'Actualizamos la dirección.',
              );
              setEditing(null);
            }}
          />
        </section>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setEditing('new')} disabled={atLimit}>
            <Plus aria-hidden className="size-4" /> Agregar dirección
          </Button>
          <p className="text-sm text-muted">
            {atLimit
              ? `Llegaste al máximo de ${MAX_ADDRESSES} direcciones. Borrá alguna para agregar otra.`
              : `${data.length} de ${MAX_ADDRESSES} direcciones guardadas.`}
          </p>
        </div>
      )}

      {data.length === 0 && !editing ? (
        <EmptyState
          title="Todavía no guardaste direcciones"
          description="Las vas a poder elegir al pedir un envío."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
            >
              <div className="flex items-start gap-3">
                <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-ink">{a.fullName}</p>
                  <p className="text-muted">{formatAddress(a)}</p>
                  <p className="text-muted">Tel.: {a.phone}</p>
                  {a.notes && <p className="mt-1 text-muted italic">{a.notes}</p>}
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(a)}
                  aria-label={`Editar la dirección de ${a.street} ${a.number}`}
                >
                  <Pencil aria-hidden className="size-4" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setToDelete(a)}
                  aria-label={`Borrar la dirección de ${a.street} ${a.number}`}
                >
                  <Trash2 aria-hidden className="size-4" /> Borrar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="¿Borrar esta dirección?"
        description={toDelete ? formatAddress(toDelete) : undefined}
        confirmLabel="Borrar"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null);
              toast.show('Borramos la dirección.', 'info');
            },
            onError: (err) => toast.show(errorMessage(err), 'error'),
          })
        }
      />
    </div>
  );
}
