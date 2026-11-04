import { z } from 'zod';
import type { Db, Tx } from '../db.js';
import type { Deps } from '../deps.js';
import { MAX_PRICE_CENTS } from '../lib/money.js';
import { trimmed } from '../lib/validation.js';
import { settingsDto } from './dto.js';

const DEFAULT_SETTINGS = { storeName: 'Mi tienda', shippingCostCents: 0, pickupAddress: '' };

export const updateSettingsSchema = z
  .object({
    storeName: trimmed(1, 100),
    shippingCostCents: z.number().int().min(0).max(MAX_PRICE_CENTS),
    pickupAddress: trimmed(0, 300),
  })
  .partial()
  .strict();

/** The single settings row (id = 1), created with defaults if missing. */
export async function getSettingsRow(db: Db | Tx) {
  const existing = await db.storeSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return db.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...DEFAULT_SETTINGS },
    update: {},
  });
}

export async function getStoreInfo(deps: Deps) {
  return settingsDto(await getSettingsRow(deps.prisma));
}

export async function updateSettings(deps: Deps, input: z.output<typeof updateSettingsSchema>) {
  await getSettingsRow(deps.prisma);
  const updated = await deps.prisma.storeSettings.update({ where: { id: 1 }, data: input });
  return settingsDto(updated);
}
