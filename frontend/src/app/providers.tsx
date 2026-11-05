'use client';

import {
  QueryClient,
  QueryClientProvider,
  environmentManager,
  useQueryClient,
} from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { setUnauthorizedHandler } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { loginUrl } from '@/lib/auth/next-param';
import { sessionKey } from '@/hooks/use-session';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        // Do not retry client errors (4xx): they will not fix themselves.
        retry: (failureCount, error) =>
          !(isApiError(error) && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

/** When any request answers 401: forget the session and go to login, then come back. */
function UnauthorizedRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(sessionKey, null);
      queryClient.removeQueries({ queryKey: ['cart'] });
      if (pathname === '/login' || pathname === '/register') return;
      const query = searchParams.toString();
      router.push(loginUrl(`${pathname}${query ? `?${query}` : ''}`));
    });
    return () => setUnauthorizedHandler(null);
  }, [pathname, queryClient, router, searchParams]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Suspense fallback={null}>
          <UnauthorizedRedirect />
        </Suspense>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
