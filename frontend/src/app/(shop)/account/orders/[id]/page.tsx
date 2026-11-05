import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/account/require-auth';
import { MyOrderDetail } from '@/components/orders/my-order-detail';

export const metadata: Metadata = { title: 'Detalle del pedido', robots: { index: false } };

async function Detail({ params }: { params: PageProps<'/account/orders/[id]'>['params'] }) {
  const { id } = await params;
  return <MyOrderDetail id={id} />;
}

export default function MyOrderPage(props: PageProps<'/account/orders/[id]'>) {
  return (
    <Suspense>
      <RequireAuth>
        <Detail params={props.params} />
      </RequireAuth>
    </Suspense>
  );
}
