import { normalizeText } from './text.js';

export function slugify(value: string): string {
  const slug = normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug || 'item';
}

/** Returns `base`, or `base-2`, `base-3`, ... (the first candidate for which `exists` is false). */
export async function uniqueSlug(
  value: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(value);
  let candidate = base;
  for (let n = 2; await exists(candidate); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}
