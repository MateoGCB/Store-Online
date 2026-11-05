import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/page-header';
import { ProductForm } from '@/components/admin/product-form';

export const metadata: Metadata = { title: 'Nuevo producto' };

export default function NewProductPage() {
  return (
    <>
      <AdminPageHeader
        title="Nuevo producto"
        description="Después de crearlo vas a poder subir imágenes."
      />
      <div className="max-w-3xl">
        <ProductForm />
      </div>
    </>
  );
}
