import { mkdirSync } from 'node:fs';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createPrisma } from './db.js';
import type { Deps } from './deps.js';
import { systemClock } from './lib/clock.js';
import { createLogger } from './logger.js';
import { LocalStorage } from './storage/local.storage.js';

const env = loadEnv();
const logger = createLogger(env);
mkdirSync(env.UPLOAD_DIR, { recursive: true });

const deps: Deps = {
  env,
  logger,
  prisma: createPrisma(env.DATABASE_URL),
  clock: systemClock,
  payments: null,
  storage: new LocalStorage(env.UPLOAD_DIR, env.PUBLIC_API_URL),
};

const app = createApp(deps);
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, `API listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    void deps.prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
