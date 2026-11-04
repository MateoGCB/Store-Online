import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type Pagination = z.output<typeof paginationQuery>;

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function toSkipTake(p: Pagination) {
  return { skip: (p.page - 1) * p.pageSize, take: p.pageSize };
}
