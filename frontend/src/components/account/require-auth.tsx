'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { loginUrl } from '@/lib/auth/next-param';

/** Pages that need a session: without one, go to /login?next=<this page>. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    if (!isLoading && !user) router.replace(loginUrl(`${pathname}${search ? `?${search}` : ''}`));
  }, [isLoading, user, router, pathname, search]);

  if (!user) {
    return (
      <LoadingRegion label="Cargando…">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </LoadingRegion>
    );
  }
  return <>{children}</>;
}
