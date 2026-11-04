import type { Logger } from 'pino';
import type { Env } from './config/env.js';
import type { Db } from './db.js';
import type { Clock } from './lib/clock.js';
import type { PaymentProvider } from './payments/payment-provider.js';
import type { StorageProvider } from './storage/storage-provider.js';

/** Everything services need from the outside world, injected so tests can swap pieces. */
export interface Deps {
  env: Env;
  prisma: Db;
  clock: Clock;
  /** null when Mercado Pago credentials are not configured (development only). */
  payments: PaymentProvider | null;
  storage: StorageProvider;
  logger: Logger;
}
