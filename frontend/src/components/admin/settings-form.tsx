'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, inputClasses } from '@/components/ui/field';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ErrorState, FormError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAdminSettings, useUpdateSettings } from '@/hooks/use-admin';
import { errorMessage } from '@/lib/api/errors';
import type { StoreInfo } from '@/lib/api/types';
import { centsToPesosInput, pesosToCents } from '@/lib/format/money';
import { AdminPageHeader } from './page-header';

const schema = z.object({
  storeName: z
    .string()
    .trim()
    .min(1, 'Ingresá el nombre de la tienda.')
    .max(100, 'Máximo 100 caracteres.'),
  shipping: z
    .string()
    .refine(
      (v) => pesosToCents(v) !== null,
      'Ingresá un costo válido en pesos, por ejemplo 3500 o 3500,50.',
    ),
  pickupAddress: z.string().trim().max(300, 'Máximo 300 caracteres.'),
});

type Values = z.infer<typeof schema>;

function Form({ settings }: { settings: StoreInfo }) {
  const update = useUpdateSettings();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      storeName: settings.storeName,
      shipping: centsToPesosInput(settings.shippingCostCents),
      pickupAddress: settings.pickupAddress,
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (update.isPending) return;
    setFormError(null);
    update.mutate(
      {
        storeName: values.storeName,
        shippingCostCents: pesosToCents(values.shipping)!,
        pickupAddress: values.pickupAddress,
      },
      {
        onSuccess: (saved) => {
          toast.show('Guardamos la configuración. La tienda la muestra en hasta un minuto.');
          reset({
            storeName: saved.storeName,
            shipping: centsToPesosInput(saved.shippingCostCents),
            pickupAddress: saved.pickupAddress,
          });
        },
        onError: (err) => setFormError(errorMessage(err)),
      },
    );
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="max-w-2xl space-y-5 rounded-card border border-line bg-surface p-6"
    >
      <FormError message={formError} />
      <Field label="Nombre de la tienda" error={errors.storeName?.message}>
        <input className={inputClasses} {...register('storeName')} />
      </Field>
      <Field
        label="Costo de envío (en pesos)"
        error={errors.shipping?.message}
        hint="Se cobra igual a todos los envíos a domicilio."
      >
        <input inputMode="decimal" className={inputClasses} {...register('shipping')} />
      </Field>
      <Field
        label="Dirección de retiro"
        error={errors.pickupAddress?.message}
        hint="Se muestra al elegir “Retiro en el local”."
      >
        <textarea rows={2} className={inputClasses} {...register('pickupAddress')} />
      </Field>
      <Button type="submit" loading={update.isPending} disabled={!isDirty}>
        Guardar cambios
      </Button>
    </form>
  );
}

export function SettingsForm() {
  const { data, isPending, isError, refetch } = useAdminSettings();
  return (
    <>
      <AdminPageHeader title="Configuración" description="Datos generales de la tienda." />
      {isPending ? (
        <LoadingRegion label="Cargando configuración…">
          <Skeleton className="h-72 w-full max-w-2xl" />
        </LoadingRegion>
      ) : isError ? (
        <ErrorState action={<Button onClick={() => refetch()}>Reintentar</Button>} />
      ) : (
        <Form settings={data} />
      )}
    </>
  );
}
