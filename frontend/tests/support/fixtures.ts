import type { AdminOrder, Address, Cart, StoreInfo, User } from '@/lib/api/types';

export const customer: User = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
  name: 'Ana Pérez',
  role: 'CUSTOMER',
};

export const admin: User = {
  ...customer,
  id: '22222222-2222-4222-8222-222222222222',
  role: 'ADMIN',
};

export const storeInfo: StoreInfo = {
  storeName: 'TIENDA',
  shippingCostCents: 350000,
  pickupAddress: 'Calle Falsa 123, Springfield',
};

export const address: Address = {
  id: '33333333-3333-4333-8333-333333333333',
  fullName: 'Ana Pérez',
  phone: '1155551234',
  street: 'Corrientes',
  number: '1234',
  floorApt: null,
  city: 'CABA',
  province: 'Buenos Aires',
  postalCode: 'C1043',
  notes: null,
  createdAt: '2026-11-01T10:00:00.000Z',
};

export function cart(overrides: Partial<Cart> = {}): Cart {
  return {
    items: [
      {
        productId: '44444444-4444-4444-8444-444444444444',
        name: 'Taza de cerámica',
        slug: 'taza-de-ceramica',
        image: null,
        unitPriceCents: 450000,
        quantity: 2,
        lineTotalCents: 900000,
        maxPurchasable: 5,
        warning: null,
        warningMessage: null,
      },
    ],
    subtotalCents: 900000,
    itemCount: 2,
    canCheckout: true,
    ...overrides,
  };
}

export function adminOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    number: 42,
    status: 'PAID',
    fulfillment: 'PICKUP',
    subtotalCents: 900000,
    shippingCents: 0,
    totalCents: 900000,
    shippingAddress: null,
    notes: null,
    items: [
      {
        productId: null,
        name: 'Taza',
        unitPriceCents: 450000,
        quantity: 2,
        lineTotalCents: 900000,
      },
    ],
    payment: { status: 'APPROVED' },
    expiresAt: '2026-11-04T12:30:00.000Z',
    paidAt: '2026-11-04T12:10:00.000Z',
    cancelledAt: null,
    cancelReason: null,
    createdAt: '2026-11-04T12:00:00.000Z',
    needsAttention: false,
    attentionNote: null,
    customer: { id: customer.id, email: customer.email, name: customer.name },
    payments: [],
    ...overrides,
  };
}
