import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/account/require-auth';
import { CheckoutView } from '@/components/shop/checkout-view';

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Finalizar compra</h1>
      <Suspense>
        <RequireAuth>
          <CheckoutView />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
