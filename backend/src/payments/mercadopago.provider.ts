import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { CURRENCY, centsToAmount } from '../lib/money.js';
import {
  toProviderStatus,
  type CreatePreferenceInput,
  type CreatedPreference,
  type PaymentProvider,
  type ProviderPayment,
} from './payment-provider.js';

interface MpPaymentLike {
  id?: string | number;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
}

function toPayment(p: MpPaymentLike): ProviderPayment | null {
  if (p.id === undefined || p.id === null) return null;
  return {
    id: String(p.id),
    status: toProviderStatus(p.status),
    externalReference: p.external_reference ?? null,
    amount: typeof p.transaction_amount === 'number' ? p.transaction_amount : Number.NaN,
    currency: p.currency_id ?? '',
  };
}

/** Real Mercado Pago integration using the official SDK (Checkout Pro preferences). */
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = 'mercadopago';
  private readonly config: MercadoPagoConfig;

  constructor(accessToken: string) {
    this.config = new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
  }

  async createPreference(input: CreatePreferenceInput): Promise<CreatedPreference> {
    const preference = await new Preference(this.config).create({
      body: {
        external_reference: input.orderId,
        items: input.items.map((item) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          unit_price: centsToAmount(item.unitPriceCents),
          currency_id: CURRENCY,
        })),
        payer: { email: input.payerEmail },
        // Mercado Pago can only reach a public HTTPS URL (a tunnel in local development).
        // Without one, payments are confirmed with POST /orders/:id/sync instead.
        ...(input.notificationUrl.startsWith('https://')
          ? { notification_url: input.notificationUrl }
          : {}),
        back_urls: input.backUrls,
        auto_return: 'approved',
        expires: true,
        expiration_date_to: input.expiresAt.toISOString(),
        statement_descriptor: 'TIENDA',
        metadata: { order_number: input.orderNumber },
      },
      requestOptions: { idempotencyKey: `preference-${input.orderId}` },
    });
    if (!preference.id || !preference.init_point) {
      throw new Error('Mercado Pago did not return a preference id or init_point');
    }
    return { preferenceId: preference.id, checkoutUrl: preference.init_point };
  }

  async getPayment(paymentId: string): Promise<ProviderPayment | null> {
    try {
      const payment = await new Payment(this.config).get({ id: paymentId });
      return toPayment(payment as MpPaymentLike);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) return null;
      throw err;
    }
  }

  async findPaymentsByExternalReference(externalReference: string): Promise<ProviderPayment[]> {
    const result = await new Payment(this.config).search({
      options: { external_reference: externalReference, sort: 'date_created', criteria: 'desc' },
    });
    return (result.results ?? [])
      .map((p) => toPayment(p as MpPaymentLike))
      .filter((p): p is ProviderPayment => p !== null);
  }
}
