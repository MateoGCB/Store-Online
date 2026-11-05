/**
 * Money arrives from the API as integer cents (ARS). The frontend only converts it to text
 * for display; it never does arithmetic with decimals (totals always come from the server).
 */
const formatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 123456 -> "$ 1.234,56" (with the non-breaking space Intl inserts after the sign). */
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) return formatter.format(0);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  // Build the decimal from integer parts so no floating point division is involved.
  const amount = Number(`${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`);
  return formatter.format(amount);
}

export const MAX_PRICE_CENTS = 10_000_000 * 100;

/**
 * Parses what an admin types in a price field (pesos) into exact integer cents.
 * Accepts "1999", "19,99", "19.9" or "$ 19,99"; rejects thousand separators, more than two
 * decimals, negatives and anything that is not a number. Returns null when invalid.
 */
export function pesosToCents(input: string): number | null {
  const value = input.trim().replace(/^\$\s*/, '');
  const match = /^(\d{1,8})(?:[.,](\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  const cents = whole * 100 + fraction;
  return cents <= MAX_PRICE_CENTS ? cents : null;
}

/** 199999 -> "1999,99" (the value shown when editing a price). */
export function centsToPesosInput(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `${whole},${fraction}`;
}
