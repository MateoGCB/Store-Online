import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminOrderDetail } from '@/components/admin/admin-order-detail';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Detalle del pedido' };

async function Detail({ params }: { params: PageProps<'/admin/orders/[id]'>['params'] }) {
  const { id } = await params;
  return <AdminOrderDetail id={id} />;
}

export default function AdminOrderPage(props: PageProps<'/admin/orders/[id]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Detail params={props.params} />
    </Suspense>
  );
}
