import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductEditor } from '@/components/admin/product-editor';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Editar producto' };

async function Editor({ params }: { params: PageProps<'/admin/products/[id]'>['params'] }) {
  const { id } = await params;
  return <ProductEditor id={id} />;
}

export default function EditProductPage(props: PageProps<'/admin/products/[id]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Editor params={props.params} />
    </Suspense>
  );
}
