import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCard } from '@/components/account/auth-card';
import { LoginForm } from '@/components/account/auth-forms';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Ingresar', robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthCard
      title="Ingresá a tu cuenta"
      subtitle="Para comprar, ver tus pedidos y guardar direcciones."
    >
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
