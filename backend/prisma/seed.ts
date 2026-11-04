/**
 * Development seed: admin user, store settings, 4 categories and ~20 invented products
 * with generated images. Safe to run several times (it never duplicates rows).
 * Usage: npm run db:seed (requires ADMIN_EMAIL and ADMIN_PASSWORD in .env).
 */
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import sharp from 'sharp';
import { loadEnv } from '../src/config/env.js';
import { createPrisma } from '../src/db.js';
import { slugify } from '../src/lib/slug.js';
import { normalizeText } from '../src/lib/text.js';
import { emailSchema, passwordSchema } from '../src/services/auth.service.js';
import { LocalStorage } from '../src/storage/local.storage.js';

const env = loadEnv();

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  console.error(
    'Seed aborted: set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env (the password needs 8-72 bytes, a letter and a number).',
  );
  process.exit(1);
}
const adminEmail = emailSchema.safeParse(env.ADMIN_EMAIL);
const adminPassword = passwordSchema.safeParse(env.ADMIN_PASSWORD);
if (!adminEmail.success || !adminPassword.success) {
  console.error(
    'Seed aborted: ADMIN_EMAIL must be a valid email and ADMIN_PASSWORD must have 8-72 bytes with a letter and a number.',
  );
  process.exit(1);
}

const prisma = createPrisma(env.DATABASE_URL, 5);
const storage = new LocalStorage(env.UPLOAD_DIR, env.PUBLIC_API_URL);

const categories = ['Cocina', 'Hogar', 'Jardín', 'Papelería'] as const;

const products: Array<{
  name: string;
  category: (typeof categories)[number];
  priceCents: number;
  stock: number;
  color: string;
  description: string;
}> = [
  {
    name: 'Taza de cerámica esmaltada',
    category: 'Cocina',
    priceCents: 450000,
    stock: 25,
    color: '#c0392b',
    description: 'Taza de 350 ml hecha a mano, apta para lavavajillas.',
  },
  {
    name: 'Set de cucharas de madera',
    category: 'Cocina',
    priceCents: 890000,
    stock: 12,
    color: '#a0522d',
    description: 'Tres cucharas de madera de algarrobo con terminación natural.',
  },
  {
    name: 'Tabla para picar de bambú',
    category: 'Cocina',
    priceCents: 1250000,
    stock: 8,
    color: '#d4a017',
    description: 'Tabla de 40 x 25 cm con canaleta para jugos.',
  },
  {
    name: 'Frasco hermético de vidrio',
    category: 'Cocina',
    priceCents: 320000,
    stock: 40,
    color: '#5dade2',
    description: 'Frasco de 1 litro con tapa de cierre a presión.',
  },
  {
    name: 'Mate de calabaza forrado',
    category: 'Cocina',
    priceCents: 1599900,
    stock: 3,
    color: '#6e2c00',
    description: 'Mate tradicional forrado en cuero con virola de alpaca.',
  },
  {
    name: 'Delantal de lino',
    category: 'Cocina',
    priceCents: 1100000,
    stock: 0,
    color: '#7f8c8d',
    description: 'Delantal unisex con bolsillo frontal y tiras regulables.',
  },
  {
    name: 'Manta tejida a crochet',
    category: 'Hogar',
    priceCents: 3450000,
    stock: 5,
    color: '#8e44ad',
    description: 'Manta de 120 x 150 cm tejida a mano en lana merino.',
  },
  {
    name: 'Almohadón de pana',
    category: 'Hogar',
    priceCents: 980000,
    stock: 18,
    color: '#16a085',
    description: 'Almohadón de 45 x 45 cm con funda desmontable.',
  },
  {
    name: 'Vela de soja aromática',
    category: 'Hogar',
    priceCents: 560000,
    stock: 30,
    color: '#f5b041',
    description: 'Vela de cera de soja con aroma a limón y jengibre.',
  },
  {
    name: 'Portarretrato de madera',
    category: 'Hogar',
    priceCents: 740000,
    stock: 2,
    color: '#935116',
    description: 'Marco para fotos de 13 x 18 cm en madera reciclada.',
  },
  {
    name: 'Canasto de mimbre',
    category: 'Hogar',
    priceCents: 1890000,
    stock: 7,
    color: '#b9770e',
    description: 'Canasto organizador de 35 cm de diámetro con asas.',
  },
  {
    name: 'Espejo redondo con marco de yute',
    category: 'Hogar',
    priceCents: 2790000,
    stock: 4,
    color: '#a04000',
    description: 'Espejo de 50 cm de diámetro con marco trenzado.',
  },
  {
    name: 'Maceta de cerámica',
    category: 'Jardín',
    priceCents: 690000,
    stock: 22,
    color: '#ca6f1e',
    description: 'Maceta de 15 cm con plato, ideal para suculentas.',
  },
  {
    name: 'Regadera de zinc',
    category: 'Jardín',
    priceCents: 1450000,
    stock: 6,
    color: '#566573',
    description: 'Regadera de 5 litros con pico desmontable.',
  },
  {
    name: 'Kit de semillas aromáticas',
    category: 'Jardín',
    priceCents: 380000,
    stock: 50,
    color: '#229954',
    description: 'Albahaca, perejil, ciboulette y orégano para la huerta.',
  },
  {
    name: 'Guantes de jardinería',
    category: 'Jardín',
    priceCents: 520000,
    stock: 15,
    color: '#1e8449',
    description: 'Guantes de algodón con palma reforzada, talle único.',
  },
  {
    name: 'Cuaderno de diseño A5',
    category: 'Papelería',
    priceCents: 650000,
    stock: 35,
    color: '#2e86c1',
    description: 'Cuaderno con tapa dura, 96 hojas punteadas.',
  },
  {
    name: 'Set de lápices de colores',
    category: 'Papelería',
    priceCents: 870000,
    stock: 20,
    color: '#e74c3c',
    description: 'Caja de 24 lápices de colores profesionales.',
  },
  {
    name: 'Agenda semanal 2027',
    category: 'Papelería',
    priceCents: 1190000,
    stock: 10,
    color: '#1abc9c',
    description: 'Agenda con vista semanal, calendario y hojas de notas.',
  },
  {
    name: 'Lapicera de pluma',
    category: 'Papelería',
    priceCents: 2250000,
    stock: 1,
    color: '#34495e',
    description: 'Lapicera de pluma con cartucho recargable y estuche.',
  },
];

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Solid color image with the product name, generated locally (no downloads). */
async function placeholderImage(name: string, color: string): Promise<Buffer> {
  const words = name.split(' ');
  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + word).length <= 18) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  const text = lines
    .map(
      (line, i) =>
        `<text x="400" y="${400 + (i - (lines.length - 1) / 2) * 70}" font-size="56" font-family="sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapeXml(line)}</text>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="100%" height="100%" fill="${color}"/>${text}</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}

async function main() {
  const passwordHash = await argon2.hash(adminPassword.data!, { type: argon2.argon2id });
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail.data! } });
  if (existingAdmin) {
    await prisma.user.update({ where: { id: existingAdmin.id }, data: { role: 'ADMIN' } });
    console.log(`Admin ${adminEmail.data} already exists (password left unchanged).`);
  } else {
    await prisma.user.create({
      data: { email: adminEmail.data!, name: 'Administración', passwordHash, role: 'ADMIN' },
    });
    console.log(`Admin ${adminEmail.data} created.`);
  }

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      storeName: 'Tienda de Prueba',
      shippingCostCents: 350000,
      pickupAddress: 'Calle Falsa 123, Ciudad de Ejemplo (lunes a viernes de 10 a 18 h)',
    },
    update: {},
  });

  const categoryIds = new Map<string, string>();
  for (const name of categories) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      create: { name, slug: slugify(name) },
      update: {},
    });
    categoryIds.set(name, category.id);
  }

  let created = 0;
  let images = 0;
  for (const [index, p] of products.entries()) {
    const slug = slugify(p.name);
    let product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          slug,
          description: p.description,
          searchText: normalizeText(`${p.name} ${p.description}`),
          priceCents: p.priceCents,
          stock: p.stock,
          categoryId: categoryIds.get(p.category)!,
          // Spread creation dates so "newest" ordering is meaningful.
          createdAt: new Date(Date.now() - (products.length - index) * 3600_000),
        },
      });
      if (p.stock > 0) {
        await prisma.stockMovement.create({
          data: { productId: product.id, delta: p.stock, reason: 'INITIAL', note: 'Seed' },
        });
      }
      created++;
    }
    const imageCount = await prisma.productImage.count({ where: { productId: product.id } });
    if (imageCount === 0) {
      const key = `products/${randomUUID()}.webp`;
      await storage.save(key, await placeholderImage(p.name, p.color), 'image/webp');
      await prisma.productImage.create({
        data: { productId: product.id, storageKey: key, position: 0, alt: p.name },
      });
      images++;
    }
  }
  console.log(
    `Seed done: ${categories.length} categories, ${products.length} products (${created} new), ${images} images generated.`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
