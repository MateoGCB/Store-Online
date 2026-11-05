import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/account/require-auth';
import { CartView } from '@/components/shop/cart-view';

export const metadata: Metadata = { title: 'Carrito', robots: { index: false } };

export default function CartPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Tu carrito</h1>
      <Suspense>
        <RequireAuth>
          <CartView />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
