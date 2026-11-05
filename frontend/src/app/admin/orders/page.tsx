import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrdersTable } from '@/components/admin/orders-table';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Pedidos' };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <OrdersTable />
    </Suspense>
  );
}
