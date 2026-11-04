/** Lowercases and strips accents/diacritics ("Café Ñandú" -> "cafe nandu"). */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
