import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/api/server';
import { siteOrigin } from '@/lib/site-url';

const MAX_PAGES = 40; // 40 x 50 products

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  const entries: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${origin}/products`, changeFrequency: 'daily', priority: 0.9 },
  ];
  try {
    const categories = await getCategories();
    for (const c of categories) {
      entries.push({ url: `${origin}/products?category=${c.slug}`, changeFrequency: 'weekly' });
    }
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await getProducts(`sort=newest&page=${page}&pageSize=50`);
      for (const p of data.items) {
        entries.push({
          url: `${origin}/products/${p.slug}`,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
      if (page * data.pageSize >= data.total) break;
    }
  } catch {
    // The API is down: still return the static entries.
  }
  return entries;
}
