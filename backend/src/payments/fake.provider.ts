import { randomUUID } from 'node:crypto';
import type {
  CreatePreferenceInput,
  CreatedPreference,
  PaymentProvider,
  ProviderPayment,
} from './payment-provider.js';

export interface FakePaymentProviderOptions {
  /** Provider name stored with the payments (default `mercadopago`, to mimic it in tests). */
  name?: string;
  /** Where checkout sends the buyer (default: a non-routable example URL). */
  checkoutUrl?: (input: CreatePreferenceInput, preferenceId: string) => string;
}

/**
 * In-memory provider. The automated tests register payments with `addPayment` (as if the
 * buyer paid on Mercado Pago) and then send a webhook. With PAYMENTS_PROVIDER=fake it also
 * powers the development demo mode (simulated payments).
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name: string;
  readonly preferences: CreatePreferenceInput[] = [];
  private readonly payments = new Map<string, ProviderPayment>();
  private readonly checkoutUrl: NonNullable<FakePaymentProviderOptions['checkoutUrl']>;
  failNextPreference = false;
  failGetPayment = false;

  constructor(options: FakePaymentProviderOptions = {}) {
    this.name = options.name ?? 'mercadopago';
    this.checkoutUrl =
      options.checkoutUrl ??
      ((_input, preferenceId) => `https://payments.example.test/checkout/${preferenceId}`);
  }

  async createPreference(input: CreatePreferenceInput): Promise<CreatedPreference> {
    if (this.failNextPreference) {
      this.failNextPreference = false;
      throw new Error('fake provider: preference creation failed');
    }
    this.preferences.push(input);
    const preferenceId = `pref-${randomUUID()}`;
    return { preferenceId, checkoutUrl: this.checkoutUrl(input, preferenceId) };
  }

  async getPayment(paymentId: string): Promise<ProviderPayment | null> {
    if (this.failGetPayment) throw new Error('fake provider: unavailable');
    return this.payments.get(paymentId) ?? null;
  }

  async findPaymentsByExternalReference(externalReference: string): Promise<ProviderPayment[]> {
    return [...this.payments.values()].filter((p) => p.externalReference === externalReference);
  }

  addPayment(payment: ProviderPayment): ProviderPayment {
    this.payments.set(payment.id, payment);
    return payment;
  }
}
