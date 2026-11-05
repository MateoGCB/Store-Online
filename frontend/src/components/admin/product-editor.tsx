'use client';

import { Archive, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAdminProduct, useArchiveProduct } from '@/hooks/use-admin';
import { errorMessage, isApiError } from '@/lib/api/errors';
import { AdminPageHeader } from './page-header';
import { ProductForm } from './product-form';
import { ProductImages } from './product-images';
import { productStatus } from './products-table';
import { StockPanel } from './stock-panel';

export function ProductEditor({ id }: { id: string }) {
  const { data: product, isPending, isError, error, refetch } = useAdminProduct(id);
  const archive = useArchiveProduct();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);

  if (isPending) {
    return (
      <LoadingRegion label="Cargando producto…">
        <Skeleton className="h-96 w-full" />
      </LoadingRegion>
    );
  }
  if (isError) {
    return isApiError(error) && error.status === 404 ? (
      <ErrorState
        title="No encontramos ese producto"
        action={<ButtonLink href="/admin/products">Volver a productos</ButtonLink>}
      />
    ) : (
      <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />
    );
  }

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={`Categoría: ${product.category.name}`}
        actions={
          <>
            {productStatus(product)}
            {!product.archivedAt && product.active && (
              <Link
                href={`/products/${product.slug}`}
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                Ver en la tienda <ExternalLink aria-hidden className="size-3.5" />
              </Link>
            )}
            {!product.archivedAt && (
              <Button variant="secondary" size="sm" onClick={() => setConfirm(true)}>
                <Archive aria-hidden className="size-4" /> Archivar
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <ProductForm key={product.id + product.updatedAt} product={product} />
          <ProductImages product={product} />
        </div>
        <StockPanel product={product} />
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Archivar este producto?"
        description="Deja de verse en la tienda y no se puede editar. Los pedidos existentes no cambian."
        confirmLabel="Archivar"
        danger
        loading={archive.isPending}
        onConfirm={() =>
          archive.mutate(product.id, {
            onSuccess: () => {
              setConfirm(false);
              toast.show('Archivamos el producto.', 'info');
            },
            onError: (err) => toast.show(errorMessage(err), 'error'),
          })
        }
      />
    </>
  );
}
