import { vi } from 'vitest';

/** State and spies behind the next/navigation mock (see next-mocks.ts). */
export const navigation = {
  router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() },
  pathname: '/',
  search: '',
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
};
