'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  AdminCategory,
  AdminOrder,
  AdminOrderPage,
  AdminProduct,
  AdminProductPage,
  Category,
  OrderStatus,
  ProductImage,
  Stats,
  StockMovement,
  StoreInfo,
} from '@/lib/api/types';

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  products: ['admin', 'products'] as const,
  product: (id: string) => ['admin', 'products', id] as const,
  movements: (id: string) => ['admin', 'products', id, 'movements'] as const,
  categories: ['admin', 'categories'] as const,
  orders: ['admin', 'orders'] as const,
  order: (id: string) => ['admin', 'orders', id] as const,
  settings: ['admin', 'settings'] as const,
};

// ---------- Stats & settings ----------

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: () => api.get<Stats>('/admin/stats'),
    staleTime: 0,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: adminKeys.settings,
    queryFn: () => api.get<StoreInfo>('/admin/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<StoreInfo>) => api.patch<StoreInfo>('/admin/settings', values),
    onSuccess: (settings) => {
      queryClient.setQueryData(adminKeys.settings, settings);
      queryClient.setQueryData(['store-info'], settings);
    },
  });
}

// ---------- Categories ----------

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories,
    queryFn: async () => (await api.get<{ items: AdminCategory[] }>('/admin/categories')).items,
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id?: string; name: string }) =>
      id
        ? api.patch<Category>(`/admin/categories/${id}`, { name })
        : api.post<Category>('/admin/categories', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.categories }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.categories }),
  });
}

// ---------- Products ----------

export interface ProductListParams {
  q: string;
  archived: 'false' | 'true' | 'all';
  page: number;
}

export function useAdminProducts(params: ProductListParams) {
  const query = new URLSearchParams({
    archived: params.archived,
    page: String(params.page),
    pageSize: '20',
  });
  if (params.q) query.set('q', params.q);
  return useQuery({
    queryKey: [...adminKeys.products, 'list', params],
    queryFn: () => api.get<AdminProductPage>(`/admin/products?${query.toString()}`),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: adminKeys.product(id),
    queryFn: () => api.get<AdminProduct>(`/admin/products/${id}`),
    staleTime: 0,
  });
}

export interface ProductValues {
  name: string;
  description: string;
  priceCents: number;
  categoryId: string;
  active: boolean;
  stock?: number;
}

export function useSaveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: ProductValues }) =>
      id
        ? api.patch<AdminProduct>(`/admin/products/${id}`, values)
        : api.post<AdminProduct>('/admin/products', values),
    onSuccess: (product) => {
      queryClient.setQueryData(adminKeys.product(product.id), product);
      void queryClient.invalidateQueries({ queryKey: [...adminKeys.products, 'list'] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.categories });
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/products/${id}`),
    onSuccess: (_r, id) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.product(id) });
      void queryClient.invalidateQueries({ queryKey: [...adminKeys.products, 'list'] });
    },
  });
}

export function useAdjustStock(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { delta: number; note: string }) =>
      api.post<AdminProduct>(`/admin/products/${id}/stock`, values),
    onSuccess: (product) => {
      queryClient.setQueryData(adminKeys.product(id), product);
      void queryClient.invalidateQueries({ queryKey: adminKeys.movements(id) });
      void queryClient.invalidateQueries({ queryKey: [...adminKeys.products, 'list'] });
    },
  });
}

export function useStockMovements(id: string) {
  return useQuery({
    queryKey: adminKeys.movements(id),
    queryFn: async () =>
      (await api.get<{ items: StockMovement[] }>(`/admin/products/${id}/stock-movements`)).items,
    staleTime: 0,
  });
}

function useImageMutation<T>(id: string, fn: (arg: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.product(id) }),
  });
}

export function useUploadImage(id: string) {
  return useImageMutation(id, ({ file, alt }: { file: File; alt: string }) => {
    const form = new FormData();
    form.append('image', file);
    form.append('alt', alt);
    return api.upload<ProductImage>(`/admin/products/${id}/images`, form);
  });
}

export function useDeleteImage(id: string) {
  return useImageMutation(id, (imageId: string) =>
    api.delete<void>(`/admin/products/${id}/images/${imageId}`),
  );
}

export function useReorderImages(id: string) {
  return useImageMutation(id, (imageIds: string[]) =>
    api.put<unknown>(`/admin/products/${id}/images/order`, { imageIds }),
  );
}

// ---------- Orders ----------

export interface OrderListParams {
  status: OrderStatus | '';
  number: string;
  from: string;
  to: string;
  needsAttention: boolean;
  page: number;
}

/** Dates come from <input type="date"> (local day): the whole day in Argentina (UTC-3). */
export function orderListQuery(params: OrderListParams): string {
  const query = new URLSearchParams({ page: String(params.page), pageSize: '20' });
  if (params.status) query.set('status', params.status);
  if (/^\d+$/.test(params.number)) query.set('number', params.number);
  if (params.from) query.set('from', `${params.from}T00:00:00-03:00`);
  if (params.to) query.set('to', `${params.to}T23:59:59-03:00`);
  if (params.needsAttention) query.set('needsAttention', 'true');
  return query.toString();
}

export function useAdminOrders(params: OrderListParams) {
  return useQuery({
    queryKey: [...adminKeys.orders, 'list', params],
    queryFn: () => api.get<AdminOrderPage>(`/admin/orders?${orderListQuery(params)}`),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: adminKeys.order(id),
    queryFn: () => api.get<AdminOrder>(`/admin/orders/${id}`),
    staleTime: 0,
  });
}

function useOrderAction<T>(id: string, fn: (arg: T) => Promise<AdminOrder>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (order) => {
      queryClient.setQueryData(adminKeys.order(id), order);
      void queryClient.invalidateQueries({ queryKey: [...adminKeys.orders, 'list'] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.stats });
    },
  });
}

export function useChangeOrderStatus(id: string) {
  return useOrderAction(id, (values: { status: OrderStatus; fromStatus: OrderStatus }) =>
    api.patch<AdminOrder>(`/admin/orders/${id}/status`, values),
  );
}

export function useCancelOrder(id: string) {
  return useOrderAction(id, (reason: string) =>
    api.post<AdminOrder>(`/admin/orders/${id}/cancel`, { reason }),
  );
}

export function useResolveAttention(id: string) {
  return useOrderAction(id, () => api.post<AdminOrder>(`/admin/orders/${id}/resolve-attention`));
}
