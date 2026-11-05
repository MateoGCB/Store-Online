'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False while React hydrates the server HTML (and on the server), true afterwards. UI that
 * depends on browser-only data (the session) renders exactly like the server until then,
 * so hydration never mismatches even if that data arrives early.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
