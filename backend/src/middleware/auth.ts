import type { RequestHandler } from 'express';
import type { Deps } from '../deps.js';
import { forbidden, unauthenticated } from '../lib/errors.js';
import { SESSION_COOKIE, resolveSession } from '../services/session.service.js';

function readCookie(req: Parameters<RequestHandler>[0]): string | undefined {
  const value: unknown = req.cookies?.[SESSION_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

/** Requires a valid session; the user (and role) is read from the database on every request. */
export function requireAuth(deps: Deps): RequestHandler {
  return async (req, _res, next) => {
    const user = await resolveSession(deps, readCookie(req));
    if (!user) return next(unauthenticated());
    req.user = user;
    next();
  };
}

/** Requires a valid session of a user with the ADMIN role (401 without session, 403 otherwise). */
export function requireAdmin(deps: Deps): RequestHandler {
  return async (req, _res, next) => {
    const user = await resolveSession(deps, readCookie(req));
    if (!user) return next(unauthenticated());
    if (user.role !== 'ADMIN') return next(forbidden());
    req.user = user;
    next();
  };
}
