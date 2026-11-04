import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export interface RateLimitConfig {
  loginMax: number;
  registerMax: number;
  checkoutMax: number;
}

const tooMany = () =>
  new AppError(
    429,
    'RATE_LIMITED',
    'Hiciste demasiados intentos. Esperá un rato y probá de nuevo.',
  );

function limiter(windowMs: number, limit: number, byUser = false): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) =>
      byUser && req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip ?? ''),
    handler: (_req, _res, next) => next(tooMany()),
  });
}

/** Each call creates fresh in-memory counters (one set per app instance). */
export function createRateLimiters(config: RateLimitConfig) {
  return {
    login: limiter(15 * 60_000, config.loginMax),
    register: limiter(60 * 60_000, config.registerMax),
    checkout: limiter(60_000, config.checkoutMax, true),
  };
}

export type RateLimiters = ReturnType<typeof createRateLimiters>;
