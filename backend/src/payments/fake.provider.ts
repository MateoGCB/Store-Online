import { randomUUID } from 'node:crypto';
import type {
  CreatePreferenceInput,
  CreatedPreference,
  PaymentProvider,
  ProviderPayment,
} from './payment-provider.js';

/**
 * In-memory provider used by the automated tests. Tests register payments with
 * `addPayment` (as if the buyer paid on Mercado Pago) and then send a webhook.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'mercadopago';
  readonly preferences: CreatePreferenceInput[] = [];
  private readonly payments = new Map<string, ProviderPayment>();
  failNextPreference = false;
  failGetPayment = false;

  async createPreference(input: CreatePreferenceInput): Promise<CreatedPreference> {
    if (this.failNextPreference) {
      this.failNextPreference = false;
      throw new Error('fake provider: preference creation failed');
    }
    this.preferences.push(input);
    const preferenceId = `pref-${randomUUID()}`;
    return { preferenceId, checkoutUrl: `https://payments.example.test/checkout/${preferenceId}` };
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
