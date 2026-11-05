'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, inputClasses } from '@/components/ui/field';
import { FormError } from '@/components/ui/states';
import { useLogin, useRegister } from '@/hooks/use-session';
import { errorMessage, isApiError } from '@/lib/api/errors';
import { safeNext } from '@/lib/auth/next-param';
import {
  type LoginValues,
  type RegisterValues,
  loginSchema,
  registerSchema,
} from '@/lib/auth/schemas';

function useNextPath() {
  const params = useSearchParams();
  return safeNext(params.get('next'));
}

export function LoginForm() {
  const router = useRouter();
  const next = useNextPath();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched' });

  const onSubmit = handleSubmit((values) => {
    if (login.isPending) return;
    setFormError(null);
    login.mutate(values, {
      onSuccess: () => {
        router.replace(next);
        router.refresh();
      },
      onError: (err) =>
        setFormError(
          isApiError(err) && err.code === 'INVALID_CREDENTIALS'
            ? 'El email o la contraseña no son correctos.'
            : errorMessage(err),
        ),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Field label="Email" error={errors.email?.message}>
        <input type="email" autoComplete="email" className={inputClasses} {...register('email')} />
      </Field>
      <Field label="Contraseña" error={errors.password?.message}>
        <input
          type="password"
          autoComplete="current-password"
          className={inputClasses}
          {...register('password')}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
        Ingresar
      </Button>
      <p className="text-center text-sm text-muted">
        ¿No tenés cuenta?{' '}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="font-medium text-accent hover:underline"
        >
          Creá una
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const next = useNextPath();
  const registerMutation = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), mode: 'onTouched' });

  const onSubmit = handleSubmit((values) => {
    if (registerMutation.isPending) return;
    setFormError(null);
    registerMutation.mutate(values, {
      onSuccess: () => {
        router.replace(next);
        router.refresh();
      },
      onError: (err) => {
        if (isApiError(err) && err.code === 'EMAIL_TAKEN') {
          setError('email', { message: 'Ya existe una cuenta con ese email. Probá ingresar.' });
          return;
        }
        if (isApiError(err) && err.code === 'VALIDATION_ERROR') {
          const fields = err.fieldErrors();
          for (const key of ['name', 'email', 'password'] as const) {
            if (fields[key]) setError(key, { message: fields[key] });
          }
          if (Object.keys(fields).length) return;
        }
        setFormError(errorMessage(err));
      },
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Field label="Nombre" error={errors.name?.message}>
        <input autoComplete="name" className={inputClasses} {...register('name')} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <input type="email" autoComplete="email" className={inputClasses} {...register('email')} />
      </Field>
      <Field
        label="Contraseña"
        error={errors.password?.message}
        hint="Entre 8 y 72 caracteres, con al menos una letra y un número."
      >
        <input
          type="password"
          autoComplete="new-password"
          className={inputClasses}
          {...register('password')}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={registerMutation.isPending}>
        Crear cuenta
      </Button>
      <p className="text-center text-sm text-muted">
        ¿Ya tenés cuenta?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-medium text-accent hover:underline"
        >
          Ingresá
        </Link>
      </p>
    </form>
  );
}
