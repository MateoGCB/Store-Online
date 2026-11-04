import { pino } from 'pino';
import type { Env } from './config/env.js';

/**
 * Structured logger. Request bodies, cookies and auth headers are never logged
 * (see the request serializer in app.ts); the redact list is a second safety net.
 */
export function createLogger(env: Env) {
  const level = env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info');
  return pino({
    level,
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.accessToken',
      ],
      censor: '[redacted]',
    },
  });
}
