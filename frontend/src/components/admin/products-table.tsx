'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ProductImage } from '@/components/shop/product-image';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/field';
import { Pagination } from '@/components/ui/pagination';
import { Price } from '@/components/ui/price';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { type ProductListParams, useAdminProducts } from '@/hooks/use-admin';
import type { AdminProduct } from '@/lib/api/types';
import { AdminPageHeader } from './page-header';

export function productStatus(p: Pick<AdminProduct, 'active' | 'archivedAt'>) {
  if (p.archivedAt) return <Badge>Archivado</Badge>;
  return p.active ? <Badge tone="success">Activo</Badge> : <Badge tone="warning">Inactivo</Badge>;
}

export function ProductsTable() {
  const [params, setParams] = useState<ProductListParams>({ q: '', archived: 'false', page: 1 });
  const [search, setSearch] = useState('');
  const { data, isPending, isError, refetch, isFetching } = useAdminProducts(params);

  return (
    <>
      <AdminPageHeader
        title="Productos"
        actions={
          <ButtonLink href="/admin/products/new">
            <Plus aria-hidden className="size-4" /> Nuevo producto
          </ButtonLink>
        }
      />
      <form
        className="mb-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setParams((p) => ({ ...p, q: search.trim(), page: 1 }));
        }}
      >
        <div className="min-w-56 flex-1">
          <label
            htmlFor="admin-product-search"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Buscar
          </label>
          <input
            id="admin-product-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o descripción"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="admin-product-archived"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Mostrar
          </label>
          <select
            id="admin-product-archived"
            value={params.archived}
            onChange={(e) =>
              setParams((p) => ({
                ...p,
                archived: e.target.value as ProductListParams['archived'],
                page: 1,
              }))
            }
            className={inputClasses}
          >
            <option value="false">Activos e inactivos</option>
            <option value="true">Archivados</option>
            <option value="all">Todos</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">
          <Search aria-hidden className="size-4" /> Buscar
        </Button>
      </form>

      {isPending ? (
        <LoadingRegion label="Cargando productos…">
          <Skeleton className="h-96 w-full" />
        </LoadingRegion>
      ) : isError ? (
        <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No hay productos para mostrar"
          description="Probá con otra búsqueda o creá uno nuevo."
        />
      ) : (
        <div className="space-y-6" aria-busy={isFetching || undefined}>
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Productos ({data.total})</caption>
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Producto
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Precio
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Stock
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-canvas">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          image={p.images[0]}
                          alt={p.name}
                          sizes="48px"
                          className="w-12 shrink-0 rounded-control"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="font-medium text-ink hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs text-muted">{p.category.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Price cents={p.priceCents} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={p.stock <= 5 ? 'font-semibold text-warning' : ''}>
                        {p.stock}
                      </span>
                      {p.reserved > 0 && (
                        <span className="block text-xs text-muted">{p.reserved} reservadas</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{productStatus(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(page) => setParams((p) => ({ ...p, page }))}
            label="Páginas de productos"
          />
        </div>
      )}
    </>
  );
}
