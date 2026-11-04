import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import type { Deps } from '../deps.js';
import { AppError, badRequest, conflict, notFound } from '../lib/errors.js';
import { imageDto } from './dto.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 8;
const MAX_DIMENSION = 1600;

export const imageAltInput = z.object({ alt: z.string().trim().max(200).default('') });
export const reorderImagesInput = z
  .object({ imageIds: z.array(z.uuid()).min(1).max(MAX_IMAGES_PER_PRODUCT) })
  .strict();

type ImageKind = 'jpeg' | 'png' | 'webp';

/** Detects the real type from the first bytes (magic numbers), ignoring name and extension. */
export function sniffImageType(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && png.every((b, i) => buf[i] === b)) return 'png';
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/**
 * Re-encodes to WebP: applies EXIF orientation, limits size to 1600px and drops all
 * metadata (EXIF, GPS, ICC...) because sharp does not keep it unless asked to.
 */
async function reencode(buf: Buffer): Promise<Buffer> {
  try {
    return await sharp(buf, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new AppError(
      422,
      'INVALID_IMAGE',
      'No pudimos procesar la imagen. Probá con otro archivo.',
    );
  }
}

const productNotFound = () => notFound('PRODUCT_NOT_FOUND', 'No encontramos ese producto.');

export async function uploadProductImage(
  deps: Deps,
  productId: string,
  file: Buffer | undefined,
  alt: string,
) {
  if (!file || file.length === 0) {
    throw badRequest('IMAGE_REQUIRED', 'Mandá una imagen en el campo "image".');
  }
  const product = await deps.prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw productNotFound();
  if (!sniffImageType(file)) {
    throw new AppError(415, 'UNSUPPORTED_IMAGE_TYPE', 'La imagen tiene que ser JPEG, PNG o WebP.');
  }
  const data = await reencode(file);
  const storageKey = `products/${randomUUID()}.webp`;
  await deps.storage.save(storageKey, data, 'image/webp');

  try {
    const image = await deps.prisma.$transaction(async (tx) => {
      // Lock the product row so concurrent uploads cannot exceed the limit.
      await tx.$executeRaw`SELECT 1 FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
      const count = await tx.productImage.count({ where: { productId } });
      if (count >= MAX_IMAGES_PER_PRODUCT) {
        throw conflict(
          'TOO_MANY_IMAGES',
          `Un producto puede tener como máximo ${MAX_IMAGES_PER_PRODUCT} imágenes.`,
        );
      }
      const last = await tx.productImage.findFirst({
        where: { productId },
        orderBy: { position: 'desc' },
      });
      return tx.productImage.create({
        data: { productId, storageKey, alt, position: (last?.position ?? -1) + 1 },
      });
    });
    return imageDto(image, deps.storage);
  } catch (err) {
    await deps.storage.delete(storageKey).catch(() => undefined);
    throw err;
  }
}

export async function deleteProductImage(deps: Deps, productId: string, imageId: string) {
  const image = await deps.prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw notFound('IMAGE_NOT_FOUND', 'No encontramos esa imagen.');
  await deps.prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });
    const rest = await tx.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });
    for (const [position, img] of rest.entries()) {
      if (img.position !== position) {
        await tx.productImage.update({ where: { id: img.id }, data: { position } });
      }
    }
  });
  await deps.storage.delete(image.storageKey).catch((err: unknown) => {
    deps.logger.warn({ err, storageKey: image.storageKey }, 'could not delete image file');
  });
}

export async function reorderProductImages(deps: Deps, productId: string, imageIds: string[]) {
  const product = await deps.prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw productNotFound();
  const images = await deps.prisma.$transaction(async (tx) => {
    const current = await tx.productImage.findMany({ where: { productId } });
    const currentIds = new Set(current.map((i) => i.id));
    const unique = new Set(imageIds);
    if (
      unique.size !== imageIds.length ||
      unique.size !== currentIds.size ||
      !imageIds.every((id) => currentIds.has(id))
    ) {
      throw badRequest(
        'INVALID_IMAGE_ORDER',
        'Mandá todos los ids de las imágenes del producto, sin repetir, en el orden deseado.',
      );
    }
    for (const [position, id] of imageIds.entries()) {
      await tx.productImage.update({ where: { id }, data: { position } });
    }
    return tx.productImage.findMany({ where: { productId }, orderBy: { position: 'asc' } });
  });
  return images.map((i) => imageDto(i, deps.storage));
}
