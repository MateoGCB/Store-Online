'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Field, inputClasses } from '@/components/ui/field';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, FormError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAdminCategories, useDeleteCategory, useSaveCategory } from '@/hooks/use-admin';
import { errorMessage, isApiError } from '@/lib/api/errors';
import type { AdminCategory } from '@/lib/api/types';
import { pluralize } from '@/lib/format/plural';
import { AdminPageHeader } from './page-header';

function CategoryDialog({
  category,
  open,
  onClose,
}: {
  category: AdminCategory | null;
  open: boolean;
  onClose: () => void;
}) {
  const save = useSaveCategory();
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    const value = name.trim();
    if (!value) return setError('Ingresá un nombre.');
    if (value.length > 60) return setError('Máximo 60 caracteres.');
    save.mutate(
      { id: category?.id, name: value },
      {
        onSuccess: () => {
          toast.show(category ? 'Actualizamos la categoría.' : 'Creamos la categoría.');
          onClose();
        },
        onError: (err) =>
          setError(
            isApiError(err) ? (err.fieldErrors().name ?? errorMessage(err)) : errorMessage(err),
          ),
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title={category ? 'Editar categoría' : 'Nueva categoría'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Nombre" error={error ?? undefined}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={inputClasses}
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={save.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CategoriesManager() {
  const { data, isPending, isError, refetch } = useAdminCategories();
  const remove = useDeleteCategory();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <>
      <AdminPageHeader
        title="Categorías"
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden className="size-4" /> Nueva categoría
          </Button>
        }
      />
      {isPending ? (
        <LoadingRegion label="Cargando categorías…">
          <Skeleton className="h-48 w-full" />
        </LoadingRegion>
      ) : isError ? (
        <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No hay categorías"
          description="Creá la primera para poder cargar productos."
        />
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-xs text-muted">
                  /{c.slug} · {pluralize(c.productCount, 'producto', 'productos')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditing(c)}
                  aria-label={`Editar ${c.name}`}
                >
                  <Pencil aria-hidden className="size-4" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDeleteError(null);
                    setToDelete(c);
                  }}
                  aria-label={`Borrar ${c.name}`}
                >
                  <Trash2 aria-hidden className="size-4" /> Borrar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <CategoryDialog
          key={editing === 'new' ? 'new' : editing.id}
          open
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`¿Borrar “${toDelete?.name ?? ''}”?`}
        description={
          <>
            <span className="block">Esta acción no se puede deshacer.</span>
            {deleteError && (
              <span className="mt-3 block">
                <FormError message={deleteError} />
              </span>
            )}
          </>
        }
        confirmLabel="Borrar"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null);
              toast.show('Borramos la categoría.', 'info');
            },
            onError: (err) =>
              setDeleteError(
                isApiError(err) && err.code === 'CATEGORY_HAS_PRODUCTS'
                  ? 'No se puede borrar: tiene productos asociados (incluidos los archivados). Mové esos productos a otra categoría primero.'
                  : errorMessage(err),
              ),
          })
        }
      />
    </>
  );
}
