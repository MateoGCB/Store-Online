'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { User } from '@/lib/api/types';
import type { LoginValues, RegisterValues } from '@/lib/auth/schemas';
import { useHydrated } from './use-hydrated';

export const sessionKey = ['session'] as const;

async function fetchSession(): Promise<User | null> {
  try {
    const { user } = await api.get<{ user: User }>('/auth/me', { redirectOn401: false });
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** Current user from GET /auth/me (null when there is no session). */
export function useSession() {
  const hydrated = useHydrated();
  const query = useQuery({ queryKey: sessionKey, queryFn: fetchSession, staleTime: 60_000 });
  // Until hydration finishes, behave like the server (no session known yet).
  const user = hydrated ? (query.data ?? null) : null;
  return {
    user,
    isLoading: !hydrated || query.isPending,
    isAdmin: user?.role === 'ADMIN',
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LoginValues) =>
      api.post<{ user: User }>('/auth/login', values, { redirectOn401: false }),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(sessionKey, user);
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: RegisterValues) =>
      api.post<{ user: User }>('/auth/register', values, { redirectOn401: false }),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(sessionKey, user);
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout', undefined, { redirectOn401: false }),
    onSettled: () => {
      queryClient.setQueryData(sessionKey, null);
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
    },
  });
}
