import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { apiOrigin } from './config/env.js';
import type { Deps } from './deps.js';
import './lib/validation.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { originCheck } from './middleware/origin-check.js';
import { createRateLimiters, type RateLimitConfig } from './middleware/rate-limit.js';
import { genRequestId } from './middleware/request-id.js';
import { buildApiRouter } from './routes/index.js';

export const API_PREFIX = '/api/v1';

export interface AppOptions {
  rateLimits?: Partial<RateLimitConfig>;
}

/** Builds the Express app without listening (tests use it directly with supertest). */
export function createApp(deps: Deps, options: AppOptions = {}): Express {
  const { env } = deps;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.set('query parser', 'simple');

  app.use(
    pinoHttp({
      logger: deps.logger,
      genReqId: genRequestId,
      // Only method, path (no query string) and status: no bodies, cookies or tokens.
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          path: req.url.split('?')[0],
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  const production = env.NODE_ENV === 'production';
  app.use(
    helmet({
      // Outside production the API runs on plain http://localhost: do not force HTTPS.
      strictTransportSecurity: production,
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: production ? [] : null },
      },
    }),
  );

  const corsOrigins = new Set(env.CORS_ORIGINS);
  app.use(
    cors({
      origin: (origin, callback) => callback(null, origin !== undefined && corsOrigins.has(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'Idempotent-Replayed'],
      maxAge: 600,
    }),
  );

  // Uploaded images: served as static files that the frontend (other origin) can embed.
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(path.resolve(env.UPLOAD_DIR), {
      index: false,
      dotfiles: 'deny',
      fallthrough: false,
      maxAge: '7d',
      immutable: true,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  const limiters = createRateLimiters({
    loginMax: options.rateLimits?.loginMax ?? env.RATE_LIMIT_LOGIN_MAX,
    registerMax: options.rateLimits?.registerMax ?? env.RATE_LIMIT_REGISTER_MAX,
    checkoutMax: options.rateLimits?.checkoutMax ?? env.RATE_LIMIT_CHECKOUT_MAX,
  });
  const apiRouter = buildApiRouter(deps, limiters);

  app.use(
    API_PREFIX,
    cookieParser(),
    originCheck({
      allowedOrigins: new Set([...env.CORS_ORIGINS, apiOrigin(env)]),
      isExempt: (p) => p === '/webhooks/mercadopago',
      isMultipart: (p) => /^\/admin\/products\/[^/]+\/images\/?$/.test(p),
    }),
    express.json({ limit: '100kb' }),
    apiRouter,
  );
  app.locals.apiRouter = apiRouter satisfies Router;

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
