/** Money is always handled as integer cents (ARS). */
export const CURRENCY = 'ARS';
export const MAX_PRICE_CENTS = 10_000_000 * 100;
export const MAX_ORDER_TOTAL_CENTS = 10_000_000 * 100;
export const MAX_STOCK = 100_000;

/** Converts integer cents to a decimal amount in pesos without floating point drift. */
export function centsToAmount(cents: number): number {
  if (!Number.isSafeInteger(cents)) throw new Error('cents must be a safe integer');
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return Number(`${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`);
}

/**
 * Converts a decimal amount in pesos (as returned by payment providers) to cents.
 * Returns null when the amount is not finite or has more than two decimals.
 */
export function amountToCents(amount: number): number | null {
  if (!Number.isFinite(amount)) return null;
  const fixed = Math.abs(amount).toFixed(2);
  if (Math.abs(Number(fixed) - Math.abs(amount)) > 1e-9) return null;
  const [intPart = '0', decPart = '00'] = fixed.split('.');
  const cents = Number(intPart) * 100 + Number(decPart);
  return amount < 0 ? -cents : cents;
}
