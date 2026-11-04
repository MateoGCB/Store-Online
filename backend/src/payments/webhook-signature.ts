import { InvalidWebhookSignatureError, WebhookSignatureValidator } from 'mercadopago';

export interface SignatureInput {
  xSignature: string | string[] | undefined;
  xRequestId: string | string[] | undefined;
  /** Value of the `data.id` query string parameter. */
  dataId: unknown;
  secret: string | undefined;
}

/**
 * Verifies the `x-signature` header of a Mercado Pago webhook with the official SDK
 * validator (HMAC-SHA256 over `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`).
 * Returns the failure reason, or null when the signature is valid.
 */
export function verifyWebhookSignature(input: SignatureInput): string | null {
  if (!input.secret) return 'MissingSecret';
  const dataId =
    typeof input.dataId === 'string' || Array.isArray(input.dataId)
      ? (input.dataId as string | string[])
      : undefined;
  try {
    WebhookSignatureValidator.validate({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId,
      secret: input.secret,
    });
    return null;
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) return err.reason;
    throw err;
  }
}
