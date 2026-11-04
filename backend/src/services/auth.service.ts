import argon2 from 'argon2';
import { z } from 'zod';
import type { Deps } from '../deps.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError, conflict } from '../lib/errors.js';
import { trimmed } from '../lib/validation.js';
import { userDto } from './dto.js';

const LETTER = /\p{L}/u;
const DIGIT = /\p{Nd}/u;

/** 8 to 72 BYTES (UTF-8): accented letters take 2 bytes, so the limit is not in characters. */
export const passwordSchema = z
  .string()
  .refine((v) => {
    const bytes = Buffer.byteLength(v, 'utf8');
    return bytes >= 8 && bytes <= 72;
  }, 'La contraseña tiene que tener entre 8 y 72 bytes (las letras con tilde ocupan 2).')
  .refine(
    (v) => LETTER.test(v) && DIGIT.test(v),
    'La contraseña tiene que tener al menos una letra y un número.',
  );

export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email())
  .transform((v) => v.toLowerCase());

export const registerSchema = z.object({
  name: trimmed(1, 100),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(1024),
});

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'El email o la contraseña no son correctos.');

let dummyHash: Promise<string> | undefined;
/** Hash used to spend the same time verifying when the email does not exist. */
function getDummyHash() {
  dummyHash ??= argon2.hash('dummy-password-for-timing-1');
  return dummyHash;
}

export async function register(deps: Deps, input: z.output<typeof registerSchema>) {
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  try {
    const user = await deps.prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
    return userDto(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('EMAIL_TAKEN', 'Ya existe una cuenta con ese email.');
    }
    throw err;
  }
}

export async function login(deps: Deps, input: z.output<typeof loginSchema>) {
  const user = await deps.prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await argon2.verify(await getDummyHash(), input.password).catch(() => false);
    throw invalidCredentials();
  }
  const ok = await argon2.verify(user.passwordHash, input.password).catch(() => false);
  if (!ok) throw invalidCredentials();
  return userDto(user);
}
