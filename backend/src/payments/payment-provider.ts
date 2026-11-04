/** Normalized payment status as reported by a provider. */
export type ProviderPaymentStatus =
  | 'approved'
  | 'pending'
  | 'in_process'
  | 'authorized'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'
  | 'unknown';

/** A payment as read from the provider's API (never from a webhook body). */
export interface ProviderPayment {
  id: string;
  status: ProviderPaymentStatus;
  /** Our order id, sent as `external_reference` when the preference was created. */
  externalReference: string | null;
  /** Amount in pesos as reported by the provider (decimal). */
  amount: number;
  currency: string;
}

export interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CreatePreferenceInput {
  orderId: string;
  orderNumber: number;
  items: PreferenceItem[];
  payerEmail: string;
  expiresAt: Date;
  notificationUrl: string;
  backUrls: { success: string; pending: string; failure: string };
}

export interface CreatedPreference {
  preferenceId: string;
  checkoutUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPreference(input: CreatePreferenceInput): Promise<CreatedPreference>;
  /** Returns null when the provider does not know the payment. */
  getPayment(paymentId: string): Promise<ProviderPayment | null>;
  findPaymentsByExternalReference(externalReference: string): Promise<ProviderPayment[]>;
}

const KNOWN_STATUSES: ReadonlySet<string> = new Set<ProviderPaymentStatus>([
  'approved',
  'pending',
  'in_process',
  'authorized',
  'in_mediation',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
]);

export function toProviderStatus(value: string | undefined | null): ProviderPaymentStatus {
  return value && KNOWN_STATUSES.has(value) ? (value as ProviderPaymentStatus) : 'unknown';
}
