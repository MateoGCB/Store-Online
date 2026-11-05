import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AddressesView } from '@/components/account/addresses-view';
import { RequireAuth } from '@/components/account/require-auth';

export const metadata: Metadata = { title: 'Mis direcciones', robots: { index: false } };

export default function AddressesPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Mis direcciones</h1>
      <Suspense>
        <RequireAuth>
          <AddressesView />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
