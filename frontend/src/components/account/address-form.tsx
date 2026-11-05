'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, inputClasses } from '@/components/ui/field';
import { FormError } from '@/components/ui/states';
import { useSaveAddress } from '@/hooks/use-addresses';
import { errorMessage, isApiError } from '@/lib/api/errors';
import type { Address, AddressInput } from '@/lib/api/types';

const text = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `Máximo ${max} caracteres.`);
const optional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);

/** Same limits as the API. */
export const addressSchema = z.object({
  fullName: text(100, 'Ingresá el nombre de quien recibe.'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{6,30}$/, 'Ingresá un teléfono válido.'),
  street: text(120, 'Ingresá la calle.'),
  number: text(20, 'Ingresá la altura.'),
  floorApt: optional(30),
  city: text(80, 'Ingresá la ciudad.'),
  province: text(80, 'Ingresá la provincia.'),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,10}$/, 'Ingresá un código postal válido.'),
  notes: optional(300),
});

type FormValues = z.infer<typeof addressSchema>;
const FIELDS = Object.keys(addressSchema.shape) as (keyof FormValues)[];

function toInput(values: FormValues): AddressInput {
  return { ...values, floorApt: values.floorApt || null, notes: values.notes || null };
}

export function AddressForm({
  address,
  onSaved,
  onCancel,
  submitLabel = 'Guardar dirección',
}: {
  address?: Address;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const save = useSaveAddress();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(addressSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: address?.fullName ?? '',
      phone: address?.phone ?? '',
      street: address?.street ?? '',
      number: address?.number ?? '',
      floorApt: address?.floorApt ?? '',
      city: address?.city ?? '',
      province: address?.province ?? '',
      postalCode: address?.postalCode ?? '',
      notes: address?.notes ?? '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (save.isPending) return;
    setFormError(null);
    save.mutate(
      { id: address?.id, values: toInput(values) },
      {
        onSuccess: onSaved,
        onError: (err) => {
          if (isApiError(err) && err.code === 'ADDRESS_LIMIT_REACHED') {
            setFormError('Llegaste al máximo de 10 direcciones. Borrá alguna para agregar otra.');
            return;
          }
          if (isApiError(err) && err.code === 'VALIDATION_ERROR') {
            const fields = err.fieldErrors();
            for (const key of FIELDS) if (fields[key]) setError(key, { message: fields[key] });
          }
          setFormError(errorMessage(err));
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre y apellido de quien recibe"
          error={errors.fullName?.message}
          className="sm:col-span-2"
        >
          <input autoComplete="name" className={inputClasses} {...register('fullName')} />
        </Field>
        <Field label="Teléfono" error={errors.phone?.message}>
          <input type="tel" autoComplete="tel" className={inputClasses} {...register('phone')} />
        </Field>
        <Field label="Código postal" error={errors.postalCode?.message}>
          <input autoComplete="postal-code" className={inputClasses} {...register('postalCode')} />
        </Field>
        <Field label="Calle" error={errors.street?.message}>
          <input autoComplete="address-line1" className={inputClasses} {...register('street')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Altura" error={errors.number?.message}>
            <input className={inputClasses} {...register('number')} />
          </Field>
          <Field label="Piso / Depto" error={errors.floorApt?.message} optional>
            <input
              autoComplete="address-line2"
              className={inputClasses}
              {...register('floorApt')}
            />
          </Field>
        </div>
        <Field label="Ciudad" error={errors.city?.message}>
          <input autoComplete="address-level2" className={inputClasses} {...register('city')} />
        </Field>
        <Field label="Provincia" error={errors.province?.message}>
          <input autoComplete="address-level1" className={inputClasses} {...register('province')} />
        </Field>
        <Field
          label="Indicaciones para la entrega"
          error={errors.notes?.message}
          optional
          className="sm:col-span-2"
        >
          <textarea rows={2} className={inputClasses} {...register('notes')} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" loading={save.isPending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={save.isPending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

export function formatAddress(
  a: Pick<Address, 'street' | 'number' | 'floorApt' | 'city' | 'province' | 'postalCode'>,
) {
  return `${a.street} ${a.number}${a.floorApt ? `, ${a.floorApt}` : ''} — ${a.city}, ${a.province} (${a.postalCode})`;
}
