'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Order, OrderPage, PaymentLink, StoreInfo } from '@/lib/api/types';

export const ordersKey = ['orders'] as const;
export const orderKey = (id: string) => ['orders', 'detail', id] as const;

export function useMyOrders(page: number) {
  return useQuery({
    queryKey: [...ordersKey, 'list', page],
    queryFn: () => api.get<OrderPage>(`/orders?page=${page}&pageSize=10`),
    staleTime: 0,
  });
}

export function useMyOrder(id: string) {
  return useQuery({
    queryKey: orderKey(id),
    queryFn: () => api.get<Order>(`/orders/${id}`),
    staleTime: 0,
  });
}

export function useStoreInfo() {
  return useQuery({
    queryKey: ['store-info'],
    queryFn: () => api.get<StoreInfo>('/store-info'),
    staleTime: 60_000,
  });
}

function useOrderMutation<T>(fn: (id: string) => Promise<T>, pick: (result: T) => Order) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, id) => {
      queryClient.setQueryData(orderKey(id), pick(result));
      void queryClient.invalidateQueries({ queryKey: [...ordersKey, 'list'] });
    },
  });
}

export function useCancelMyOrder() {
  return useOrderMutation(
    (id) => api.post<Order>(`/orders/${id}/cancel`),
    (order) => order,
  );
}

export function usePayMyOrder() {
  return useOrderMutation(
    (id) => api.post<PaymentLink>(`/orders/${id}/pay`),
    (link) => link.order,
  );
}

export function useSyncMyOrder() {
  return useOrderMutation(
    (id) => api.post<Order>(`/orders/${id}/sync`),
    (order) => order,
  );
}
