'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Address, AddressInput } from '@/lib/api/types';

export const addressesKey = ['addresses'] as const;
export const MAX_ADDRESSES = 10;

export function useAddresses() {
  return useQuery({
    queryKey: addressesKey,
    queryFn: async () => (await api.get<{ items: Address[] }>('/addresses')).items,
  });
}

export function useSaveAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: AddressInput }) =>
      id ? api.patch<Address>(`/addresses/${id}`, values) : api.post<Address>('/addresses', values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesKey }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesKey }),
  });
}
