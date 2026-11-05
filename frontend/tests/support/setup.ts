import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import './next-mocks';
import { navigation } from './navigation-state';
import { server } from './server';

// Any request without a handler fails the test instead of reaching the network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  vi.clearAllMocks();
  navigation.pathname = '/';
  navigation.search = '';
});
afterAll(() => server.close());
