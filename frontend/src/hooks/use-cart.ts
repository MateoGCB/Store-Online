'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Cart } from '@/lib/api/types';
import { useSession } from './use-session';

export const cartKey = ['cart'] as const;

/** The cart only exists for logged-in customers (there is no guest cart). */
export function useCart() {
  const { user } = useSession();
  return useQuery({
    queryKey: cartKey,
    queryFn: () => api.get<Cart>('/cart'),
    enabled: !!user,
    staleTime: 0,
  });
}

export function useSetCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      api.put<Cart>(`/cart/items/${productId}`, { quantity }),
    onSuccess: (cart) => queryClient.setQueryData(cartKey, cart),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => api.delete<Cart>(`/cart/items/${productId}`),
    onSuccess: (cart) => queryClient.setQueryData(cartKey, cart),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<Cart>('/cart'),
    onSuccess: (cart) => queryClient.setQueryData(cartKey, cart),
  });
}
