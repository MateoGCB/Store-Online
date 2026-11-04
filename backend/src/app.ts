import express, { type Express, type Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Deps } from './deps.js';
import './lib/validation.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { genRequestId } from './middleware/request-id.js';
import { buildApiRouter } from './routes/index.js';

export const API_PREFIX = '/api/v1';

/** Builds the Express app without listening (tests use it directly with supertest). */
export function createApp(deps: Deps): Express {
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

  const apiRouter = buildApiRouter(deps);

  app.use(API_PREFIX, express.json({ limit: '100kb' }), apiRouter);
  app.locals.apiRouter = apiRouter satisfies Router;

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
