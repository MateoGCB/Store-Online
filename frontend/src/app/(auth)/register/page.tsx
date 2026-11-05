import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCard } from '@/components/account/auth-card';
import { RegisterForm } from '@/components/account/auth-forms';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Crear cuenta', robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Creá tu cuenta"
      subtitle="Es rápido: solo necesitamos tu nombre, email y una contraseña."
    >
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
