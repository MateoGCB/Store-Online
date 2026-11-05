'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, inputClasses } from '@/components/ui/field';
import { FormError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAdminCategories, useSaveProduct } from '@/hooks/use-admin';
import { errorMessage, isApiError } from '@/lib/api/errors';
import type { AdminProduct } from '@/lib/api/types';
import { centsToPesosInput, pesosToCents } from '@/lib/format/money';

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá el nombre.').max(120, 'Máximo 120 caracteres.'),
  description: z.string().trim().max(5000, 'Máximo 5000 caracteres.'),
  price: z
    .string()
    .refine(
      (v) => pesosToCents(v) !== null,
      'Ingresá un precio válido en pesos, por ejemplo 1999,99.',
    )
    .refine((v) => (pesosToCents(v) ?? 0) > 0, 'El precio tiene que ser mayor a cero.'),
  categoryId: z.string().min(1, 'Elegí una categoría.'),
  active: z.boolean(),
  stock: z
    .string()
    .regex(/^\d{1,6}$/, 'Ingresá un número entero.')
    .refine((v) => Number(v) <= 100_000, 'Máximo 100.000 unidades.'),
});

type FormValues = z.infer<typeof productFormSchema>;

export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const toast = useToast();
  const categories = useAdminCategories();
  const save = useSaveProduct();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(productFormSchema),
    mode: 'onTouched',
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      price: product ? centsToPesosInput(product.priceCents) : '',
      categoryId: product?.category.id ?? '',
      active: product?.active ?? true,
      stock: '0',
    },
  });

  const archived = !!product?.archivedAt;

  const onSubmit = handleSubmit((values) => {
    if (save.isPending) return;
    setFormError(null);
    const priceCents = pesosToCents(values.price)!;
    save.mutate(
      {
        id: product?.id,
        values: {
          name: values.name,
          description: values.description,
          priceCents,
          categoryId: values.categoryId,
          active: values.active,
          ...(product ? {} : { stock: Number(values.stock) }),
        },
      },
      {
        onSuccess: (saved) => {
          toast.show(product ? 'Guardamos los cambios.' : 'Creamos el producto.');
          if (!product) router.push(`/admin/products/${saved.id}`);
        },
        onError: (err) => {
          if (isApiError(err) && err.code === 'VALIDATION_ERROR') {
            const fields = err.fieldErrors();
            const map: Record<string, keyof FormValues> = {
              priceCents: 'price',
              name: 'name',
              description: 'description',
              categoryId: 'categoryId',
              stock: 'stock',
            };
            for (const [apiField, formField] of Object.entries(map)) {
              if (fields[apiField]) setError(formField, { message: fields[apiField] });
            }
          }
          setFormError(errorMessage(err));
        },
      },
    );
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-5 rounded-card border border-line bg-surface p-6"
    >
      <FormError message={formError} />
      {archived && (
        <p className="text-sm text-warning">Este producto está archivado: no se puede editar.</p>
      )}
      <fieldset disabled={archived} className="space-y-5">
        <Field label="Nombre" error={errors.name?.message}>
          <input className={inputClasses} {...register('name')} />
        </Field>
        <Field label="Descripción" error={errors.description?.message} optional>
          <textarea rows={5} className={inputClasses} {...register('description')} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Precio (en pesos)"
            error={errors.price?.message}
            hint="Usá coma para los centavos: 1999,99"
          >
            <input
              inputMode="decimal"
              placeholder="0,00"
              className={inputClasses}
              {...register('price')}
            />
          </Field>
          <Field label="Categoría" error={errors.categoryId?.message}>
            <select
              className={inputClasses}
              {...register('categoryId')}
              disabled={categories.isPending || archived}
            >
              <option value="">{categories.isPending ? 'Cargando…' : 'Elegí una categoría'}</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {!product && (
            <Field
              label="Stock inicial"
              error={errors.stock?.message}
              hint="Después se ajusta con un motivo."
            >
              <input inputMode="numeric" className={inputClasses} {...register('stock')} />
            </Field>
          )}
        </div>
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" className="size-4 accent-ink" {...register('active')} />
          Visible en la tienda (activo)
        </label>
      </fieldset>
      {!archived && (
        <Button type="submit" loading={save.isPending} disabled={!!product && !isDirty}>
          {product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      )}
    </form>
  );
}
