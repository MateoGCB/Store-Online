import { z } from 'zod';
import type { Deps } from '../deps.js';
import { conflict, notFound } from '../lib/errors.js';
import { trimmed } from '../lib/validation.js';
import { addressDto } from './dto.js';

export const MAX_ADDRESSES = 10;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const addressFields = {
  fullName: trimmed(1, 100),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{6,30}$/, 'Ingresá un teléfono válido.'),
  street: trimmed(1, 120),
  number: trimmed(1, 20),
  floorApt: optionalText(30),
  city: trimmed(1, 80),
  province: trimmed(1, 80),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,10}$/, 'Ingresá un código postal válido.'),
  notes: optionalText(300),
};

export const createAddressInput = z.object(addressFields).strict();
export const updateAddressInput = z.object(addressFields).partial().strict();

const addressNotFound = () => notFound('ADDRESS_NOT_FOUND', 'No encontramos esa dirección.');

export async function listAddresses(deps: Deps, userId: string) {
  const addresses = await deps.prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return addresses.map(addressDto);
}

export async function getAddress(deps: Deps, userId: string, id: string) {
  const address = await deps.prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw addressNotFound();
  return addressDto(address);
}

export async function createAddress(
  deps: Deps,
  userId: string,
  input: z.output<typeof createAddressInput>,
) {
  const address = await deps.prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    const count = await tx.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) {
      throw conflict(
        'ADDRESS_LIMIT_REACHED',
        `Podés guardar como máximo ${MAX_ADDRESSES} direcciones.`,
      );
    }
    return tx.address.create({ data: { ...input, userId } });
  });
  return addressDto(address);
}

export async function updateAddress(
  deps: Deps,
  userId: string,
  id: string,
  input: z.output<typeof updateAddressInput>,
) {
  const result = await deps.prisma.address.updateMany({ where: { id, userId }, data: input });
  if (result.count === 0) throw addressNotFound();
  return getAddress(deps, userId, id);
}

export async function deleteAddress(deps: Deps, userId: string, id: string) {
  const result = await deps.prisma.address.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw addressNotFound();
}
