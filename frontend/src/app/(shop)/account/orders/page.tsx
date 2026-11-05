import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/account/require-auth';
import { MyOrdersView } from '@/components/orders/my-orders-view';

export const metadata: Metadata = { title: 'Mis pedidos', robots: { index: false } };

export default function MyOrdersPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Mis pedidos</h1>
      <Suspense>
        <RequireAuth>
          <MyOrdersView />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
