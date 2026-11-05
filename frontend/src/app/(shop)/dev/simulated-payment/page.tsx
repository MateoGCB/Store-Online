import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/account/require-auth';
import { SimulatedPayment } from '@/components/orders/simulated-payment';
import { Skeleton } from '@/components/ui/skeleton';
import { isPaymentSimulationEnabled } from '@/lib/api/server';

export const metadata: Metadata = { title: 'Pago simulado', robots: { index: false } };

/** Exists only when the backend runs in demo mode (PAYMENTS_PROVIDER=fake); otherwise 404. */
async function Guard() {
  await connection();
  if (!(await isPaymentSimulationEnabled())) notFound();
  return (
    <RequireAuth>
      <SimulatedPayment />
    </RequireAuth>
  );
}

export default function SimulatedPaymentPage() {
  return (
    <div className="py-6">
      <Suspense fallback={<Skeleton className="mx-auto h-64 max-w-xl" />}>
        <Guard />
      </Suspense>
    </div>
  );
}
