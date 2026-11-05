import type { Env } from '../config/env.js';
import { FakePaymentProvider } from './fake.provider.js';
import { MercadoPagoProvider } from './mercadopago.provider.js';
import type { PaymentProvider } from './payment-provider.js';

/** URL of the store page that plays the role of Mercado Pago in demo mode. */
export function simulatedCheckoutUrl(env: Pick<Env, 'FRONTEND_URL'>, orderId: string): string {
  const base = env.FRONTEND_URL.replace(/\/+$/, '');
  return `${base}/dev/simulated-payment?orderId=${encodeURIComponent(orderId)}`;
}

/**
 * Picks the payment provider from the environment. Returns null when Mercado Pago is
 * selected but has no credentials (checkout then answers 503 PAYMENTS_NOT_CONFIGURED).
 */
export function createPaymentProvider(env: Env): PaymentProvider | null {
  if (env.PAYMENTS_PROVIDER === 'fake') {
    return new FakePaymentProvider({
      name: 'simulated',
      checkoutUrl: (input) => simulatedCheckoutUrl(env, input.orderId),
    });
  }
  return env.MP_ACCESS_TOKEN ? new MercadoPagoProvider(env.MP_ACCESS_TOKEN) : null;
}
