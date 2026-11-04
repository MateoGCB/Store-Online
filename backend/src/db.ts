import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export type Db = PrismaClient;

/** Transaction client type (what `prisma.$transaction(async (tx) => ...)` receives). */
export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export function createPrisma(connectionString: string, poolSize = 20): PrismaClient {
  const adapter = new PrismaPg({ connectionString, max: poolSize });
  return new PrismaClient({ adapter });
}
