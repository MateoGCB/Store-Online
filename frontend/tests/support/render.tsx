import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDefaultNormalizer, render } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/toast';

/** Renders with a fresh QueryClient (no retries) and the toast provider. */
export function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>,
    ),
  };
}

/**
 * Keeps non-breaking spaces when matching text (Intl money uses "$ ..."), so tests
 * check the exact string instead of a whitespace-collapsed version.
 */
export const exactText = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };
