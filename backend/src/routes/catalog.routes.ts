import type { Router } from 'express';
import { z } from 'zod';
import type { Deps } from '../deps.js';
import { parseOrThrow } from '../lib/validation.js';
import {
  getProductBySlug,
  listCategories,
  listProducts,
  listProductsQuery,
} from '../services/catalog.service.js';
import { getStoreInfo } from '../services/settings.service.js';

const slugParam = z.object({ slug: z.string().trim().min(1).max(120) });

export function registerCatalogRoutes(router: Router, deps: Deps) {
  router.get('/products', async (req, res) => {
    const query = parseOrThrow(listProductsQuery, req.query);
    res.json(await listProducts(deps, query));
  });

  router.get('/products/:slug', async (req, res) => {
    const { slug } = parseOrThrow(slugParam, req.params);
    res.json(await getProductBySlug(deps, slug));
  });

  router.get('/categories', async (_req, res) => {
    res.json({ items: await listCategories(deps) });
  });

  router.get('/store-info', async (_req, res) => {
    res.json(await getStoreInfo(deps));
  });
}
