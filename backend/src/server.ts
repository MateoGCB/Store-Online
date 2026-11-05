import { mkdirSync } from 'node:fs';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createPrisma } from './db.js';
import type { Deps } from './deps.js';
import { systemClock } from './lib/clock.js';
import { createLogger } from './logger.js';
import { createPaymentProvider } from './payments/create-provider.js';
import { expireOverdueOrders } from './services/stock.service.js';
import { LocalStorage } from './storage/local.storage.js';

const env = loadEnv();
const logger = createLogger(env);
mkdirSync(env.UPLOAD_DIR, { recursive: true });

if (env.PAYMENTS_PROVIDER === 'fake') {
  logger.warn('PAYMENTS_PROVIDER=fake: payments are SIMULATED (demo mode, development only)');
} else if (!env.MP_ACCESS_TOKEN) {
  logger.warn('MP_ACCESS_TOKEN is not set: checkout will answer 503 until it is configured');
}

const deps: Deps = {
  env,
  logger,
  prisma: createPrisma(env.DATABASE_URL),
  clock: systemClock,
  payments: createPaymentProvider(env),
  storage: new LocalStorage(env.UPLOAD_DIR, env.PUBLIC_API_URL),
};

const app = createApp(deps);
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, `API listening on http://localhost:${env.PORT}`);
});

// Expire overdue reservations every minute (safe with several instances).
let job: NodeJS.Timeout | undefined;
if (env.EXPIRATION_JOB_ENABLED) {
  job = setInterval(() => {
    expireOverdueOrders(deps)
      .then((count) => {
        if (count > 0) logger.info({ count }, 'expired overdue orders');
      })
      .catch((err: unknown) => logger.error({ err }, 'expiration job failed'));
  }, 60_000);
}

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  if (job) clearInterval(job);
  server.close(() => {
    void deps.prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
