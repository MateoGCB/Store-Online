import type { Metadata } from 'next';
import { ProductsTable } from '@/components/admin/products-table';

export const metadata: Metadata = { title: 'Productos' };

export default function AdminProductsPage() {
  return <ProductsTable />;
}
