import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function originOf(value: string | undefined): string | undefined {
  if (!value || !URL.canParse(value)) return undefined;
  const origin = new URL(value).origin;
  return origin === 'null' ? undefined : origin;
}

function mediaType(header: string | undefined): string {
  return (header ?? '').split(';')[0]!.trim().toLowerCase();
}

export interface OriginCheckOptions {
  allowedOrigins: ReadonlySet<string>;
  /** Paths (relative to the mount point) authenticated by other means, e.g. signed webhooks. */
  isExempt: (path: string) => boolean;
  /** Paths that accept multipart/form-data instead of JSON (image uploads). */
  isMultipart: (path: string) => boolean;
}

/**
 * CSRF protection for cookie sessions. For state-changing methods it requires:
 *  1. an `Origin` (or `Referer`) header whose origin is in the allow-list, and
 *  2. `Content-Type: application/json` (multipart only on upload routes), which a plain
 *     HTML form cannot send cross-site without a CORS preflight.
 */
export function originCheck(options: OriginCheckOptions): RequestHandler {
  return (req, _res, next) => {
    if (!UNSAFE_METHODS.has(req.method) || options.isExempt(req.path)) return next();

    const origin = originOf(req.get('origin')) ?? originOf(req.get('referer'));
    if (!origin || !options.allowedOrigins.has(origin)) {
      return next(
        new AppError(403, 'ORIGIN_NOT_ALLOWED', 'El origen de la solicitud no está permitido.'),
      );
    }

    const type = mediaType(req.get('content-type'));
    const expected = options.isMultipart(req.path) ? 'multipart/form-data' : 'application/json';
    if (type !== expected) {
      return next(
        new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', `El Content-Type tiene que ser ${expected}.`),
      );
    }
    next();
  };
}
