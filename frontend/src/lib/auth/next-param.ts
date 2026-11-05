const BASE = 'https://internal.invalid';

/**
 * Sanitizes the `next` parameter used after login/registration. Only same-site relative
 * paths are allowed ("/products?q=x"); external URLs, protocol-relative URLs ("//evil.com"),
 * backslash tricks and schemes like "javascript:" fall back to `fallback`. Prevents open
 * redirects.
 */
export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Builds "/login?next=<current path>". */
export function loginUrl(currentPath: string): string {
  return `/login?next=${encodeURIComponent(safeNext(currentPath))}`;
}
