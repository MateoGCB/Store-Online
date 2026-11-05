import { z } from 'zod';

/** UTF-8 size of a string (the API limits passwords by BYTES, not characters). */
export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

const LETTER = /\p{L}/u;
const DIGIT = /\p{Nd}/u;

/** Same rules as the API: 8 to 72 bytes, at least one letter and one number. */
export const passwordSchema = z
  .string()
  .refine((v) => byteLength(v) >= 8, 'La contraseña tiene que tener al menos 8 caracteres.')
  .refine(
    (v) => byteLength(v) <= 72,
    'La contraseña es demasiado larga: máximo 72 bytes (las letras con tilde ocupan 2).',
  )
  .refine(
    (v) => LETTER.test(v) && DIGIT.test(v),
    'La contraseña tiene que tener al menos una letra y un número.',
  );

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Ingresá tu email.')
  .max(254, 'El email es demasiado largo.')
  .pipe(z.email('Ingresá un email válido.'));

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá tu nombre.').max(100, 'Máximo 100 caracteres.'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresá tu contraseña.'),
});

export type RegisterValues = z.infer<typeof registerSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
