import { vi } from 'vitest';

/** Shared mock for next/navigation (component tests run outside Next). */
vi.mock('next/navigation', async () => {
  const { navigation } = await import('./navigation-state');
  return {
    useRouter: () => navigation.router,
    usePathname: () => navigation.pathname,
    useSearchParams: () => new URLSearchParams(navigation.search),
    redirect: navigation.redirect,
    notFound: vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    }),
  };
});

export { navigation } from './navigation-state';
