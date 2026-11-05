import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/account/require-auth';
import { CheckoutResult } from '@/components/orders/checkout-result';

export const metadata: Metadata = { title: 'Resultado del pago', robots: { index: false } };

export default function CheckoutResultPage() {
  return (
    <div className="py-6">
      <Suspense>
        <RequireAuth>
          <CheckoutResult />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
