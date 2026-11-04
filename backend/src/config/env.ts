import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const booleanish = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const optionalSecret = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const trustProxy = z
  .string()
  .default('false')
  .transform((v, ctx): false | number => {
    if (v === 'false' || v === '0' || v === '') return false;
    if (/^\d+$/.test(v)) return Number(v);
    ctx.addIssue({ code: 'custom', message: 'TRUST_PROXY must be false or a number of hops' });
    return z.NEVER;
  });

const origins = z
  .string()
  .default('http://localhost:3000')
  .transform((v) =>
    v
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  )
  .refine((list) => list.length > 0, 'CORS_ORIGINS cannot be empty')
  .refine((list) => !list.includes('*'), 'CORS_ORIGINS cannot contain *')
  .refine(
    (list) => list.every((o) => URL.canParse(o) && new URL(o).origin === o),
    'CORS_ORIGINS must be a comma-separated list of origins like http://localhost:3000',
  );

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
    DATABASE_URL: z.url(),
    DATABASE_URL_TEST: z.url().optional(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
    CORS_ORIGINS: origins,
    FRONTEND_URL: z.url().default('http://localhost:3000'),
    PUBLIC_API_URL: z.url().default('http://localhost:4000'),
    RESERVATION_MINUTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .default(30),
    UPLOAD_DIR: z.string().min(1).default('uploads'),
    TRUST_PROXY: trustProxy,
    MP_ACCESS_TOKEN: optionalSecret,
    MP_WEBHOOK_SECRET: optionalSecret,
    ADMIN_EMAIL: optionalSecret,
    ADMIN_PASSWORD: optionalSecret,
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).default(10),
    RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().min(1).default(5),
    RATE_LIMIT_CHECKOUT_MAX: z.coerce.number().int().min(1).default(10),
    EXPIRATION_JOB_ENABLED: booleanish.default(true),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      for (const key of ['MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required in production`,
          });
        }
      }
    }
    if (env.NODE_ENV === 'test' && !env.DATABASE_URL_TEST) {
      ctx.addIssue({ code: 'custom', path: ['DATABASE_URL_TEST'], message: 'required in test' });
    }
  });

export type Env = z.output<typeof envSchema>;

/**
 * Parses and validates the environment. Throws (so the process fails at startup)
 * with a readable list of problems when something is missing or invalid.
 */
export function loadEnv(source?: NodeJS.ProcessEnv): Env {
  if (!source) loadDotenv({ quiet: true });
  const parsed = envSchema.safeParse(source ?? process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return parsed.data;
}

/** Origin of the API itself (so Swagger UI served on /docs can call the API). */
export function apiOrigin(env: Env): string {
  return new URL(env.PUBLIC_API_URL).origin;
}

/** Throws unless the database URL points to a database whose name ends in `_test`. */
export function assertTestDatabase(url: string | undefined): void {
  let name = '';
  try {
    name = decodeURIComponent(new URL(url ?? '').pathname.replace(/^\//, ''));
  } catch {
    // keep the empty name: it fails the check below
  }
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against database "${name}": its name must end in "_test".`,
    );
  }
}
