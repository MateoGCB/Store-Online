import { connection } from 'next/server';
import { getStoreInfo } from '@/lib/api/server';

/**
 * The store name always comes from GET /store-info (it is never written in the code).
 * `connection()` defers the read to request time, so building the app never needs the API.
 */
export async function StoreName() {
  await connection();
  const info = await getStoreInfo().catch(() => null);
  return <>{info?.storeName || 'Tienda'}</>;
}

export async function PickupAddress() {
  await connection();
  const info = await getStoreInfo().catch(() => null);
  if (!info?.pickupAddress) return null;
  return <>{info.pickupAddress}</>;
}
