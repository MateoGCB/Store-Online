import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: { default: 'Administración', template: '%s · Administración' },
  robots: { index: false, follow: false },
};

function ShellSkeleton() {
  return (
    <LoadingRegion label="Verificando permisos…">
      <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
        <Skeleton className="h-16 rounded-none lg:h-dvh" />
        <div className="space-y-4 p-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AdminGuard>{children}</AdminGuard>
    </Suspense>
  );
}
