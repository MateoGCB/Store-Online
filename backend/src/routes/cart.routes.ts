import type { Router } from 'express';
import { z } from 'zod';
import type { Deps } from '../deps.js';
import { parseOrThrow, uuidParam } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createAddress,
  createAddressInput,
  deleteAddress,
  getAddress,
  listAddresses,
  updateAddress,
  updateAddressInput,
} from '../services/addresses.service.js';
import {
  clearCart,
  getCart,
  removeCartItem,
  setCartItem,
  setCartItemInput,
} from '../services/cart.service.js';

const productParam = z.object({ productId: z.uuid() });

/** Customer cart and saved addresses (always scoped to the session user). */
export function registerCartRoutes(router: Router, deps: Deps) {
  const auth = requireAuth(deps);

  // ----- Cart -----
  router.get('/cart', auth, async (req, res) => {
    res.json(await getCart(deps, req.user!.id));
  });
  router.put('/cart/items/:productId', auth, async (req, res) => {
    const { productId } = parseOrThrow(productParam, req.params);
    const { quantity } = parseOrThrow(setCartItemInput, req.body);
    res.json(await setCartItem(deps, req.user!.id, productId, quantity));
  });
  router.delete('/cart/items/:productId', auth, async (req, res) => {
    const { productId } = parseOrThrow(productParam, req.params);
    res.json(await removeCartItem(deps, req.user!.id, productId));
  });
  router.delete('/cart', auth, async (req, res) => {
    res.json(await clearCart(deps, req.user!.id));
  });

  // ----- Addresses -----
  router.get('/addresses', auth, async (req, res) => {
    res.json({ items: await listAddresses(deps, req.user!.id) });
  });
  router.post('/addresses', auth, async (req, res) => {
    const input = parseOrThrow(createAddressInput, req.body);
    res.status(201).json(await createAddress(deps, req.user!.id, input));
  });
  router.get('/addresses/:id', auth, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    res.json(await getAddress(deps, req.user!.id, id));
  });
  router.patch('/addresses/:id', auth, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    const input = parseOrThrow(updateAddressInput, req.body);
    res.json(await updateAddress(deps, req.user!.id, id, input));
  });
  router.delete('/addresses/:id', auth, async (req, res) => {
    const { id } = parseOrThrow(uuidParam, req.params);
    await deleteAddress(deps, req.user!.id, id);
    res.status(204).end();
  });
}
