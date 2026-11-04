import type { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { Deps } from '../deps.js';
import { parseOrThrow, uuidParam } from '../lib/validation.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  adjustStock,
  adminProductsQuery,
  archiveProduct,
  categoryInput,
  createCategory,
  createProduct,
  createProductInput,
  deleteCategory,
  getAdminProduct,
  listAdminCategories,
  listAdminProducts,
  listStockMovements,
  stockAdjustmentInput,
  updateCategory,
  updateProduct,
  updateProductInput,
} from '../services/admin-catalog.service.js';
import {
  MAX_IMAGE_BYTES,
  deleteProductImage,
  imageAltInput,
  reorderImagesInput,
  reorderProductImages,
  uploadProductImage,
} from '../services/images.service.js';
import {
  getSettingsRow,
  updateSettings,
  updateSettingsSchema,
} from '../services/settings.service.js';
import { settingsDto } from '../services/dto.js';

const imageParams = z.object({ id: z.uuid(), imageId: z.uuid() });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5, fieldSize: 1024 },
});

/** Catalog administration: categories, products, stock, images and store settings. */
export function registerAdminRoutes(router: Router, deps: Deps) {
  const admin = requireAdmin(deps);

  // ----- Categories -----
  router.get('/admin/categories', admin, async (_req, res) => {
    res.json({ items: await listAdminCategories(deps) });
  });
  router.post('/admin/categories', admin, async (req, res) => {
    res.status(201).json(await createCategory(deps, parseOrThrow(categoryInput, req.body)));
  });
  router.patch('/admin/categories/:id', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await updateCategory(deps, id, parseOrThrow(categoryInput, req.body)));
  });
  router.delete('/admin/categories/:id', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    await deleteCategory(deps, id);
    res.status(204).end();
  });

  // ----- Products -----
  router.get('/admin/products', admin, async (req, res) => {
    res.json(await listAdminProducts(deps, parseOrThrow(adminProductsQuery, req.query)));
  });
  router.post('/admin/products', admin, async (req, res) => {
    const input = parseOrThrow(createProductInput, req.body);
    res.status(201).json(await createProduct(deps, req.user!.id, input));
  });
  router.get('/admin/products/:id', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await getAdminProduct(deps, id));
  });
  router.patch('/admin/products/:id', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await updateProduct(deps, id, parseOrThrow(updateProductInput, req.body)));
  });
  router.delete('/admin/products/:id', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    await archiveProduct(deps, id);
    res.status(204).end();
  });
  router.post('/admin/products/:id/stock', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    const input = parseOrThrow(stockAdjustmentInput, req.body);
    res.json(await adjustStock(deps, id, req.user!.id, input));
  });
  router.get('/admin/products/:id/stock-movements', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json({ items: await listStockMovements(deps, id) });
  });

  // ----- Images -----
  router.post('/admin/products/:id/images', admin, upload.single('image'), async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    const { alt } = parseOrThrow(imageAltInput, req.body ?? {});
    res.status(201).json(await uploadProductImage(deps, id, req.file?.buffer, alt));
  });
  router.delete('/admin/products/:id/images/:imageId', admin, async (req, res) => {
    const { id, imageId } = parseOrThrow(imageParams, req.params);
    await deleteProductImage(deps, id, imageId);
    res.status(204).end();
  });
  router.put('/admin/products/:id/images/order', admin, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    const { imageIds } = parseOrThrow(reorderImagesInput, req.body);
    res.json({ items: await reorderProductImages(deps, id, imageIds) });
  });

  // ----- Settings -----
  router.get('/admin/settings', admin, async (_req, res) => {
    res.json(settingsDto(await getSettingsRow(deps.prisma)));
  });
  router.patch('/admin/settings', admin, async (req, res) => {
    res.json(await updateSettings(deps, parseOrThrow(updateSettingsSchema, req.body)));
  });
}
