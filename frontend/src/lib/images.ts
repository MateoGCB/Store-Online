/**
 * The API returns absolute image URLs (PUBLIC_API_URL/uploads/...). The store serves them
 * through its own origin (`/uploads/...` is proxied to the API), so next/image can optimize
 * them as local images without reaching a private network address.
 */
export function imageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { pathname } = new URL(url, 'http://placeholder.invalid');
    return pathname.startsWith('/uploads/') ? pathname : null;
  } catch {
    return null;
  }
}
