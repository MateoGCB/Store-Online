import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/site-url';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/cart', '/checkout', '/login', '/register', '/dev', '/api'],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
