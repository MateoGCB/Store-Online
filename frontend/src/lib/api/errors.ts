const GENERIC_MESSAGE = 'Ocurrió un error inesperado. Probá de nuevo en unos minutos.';

export interface FieldErrorDetail {
  field: string;
  message: string;
}

/**
 * Error returned by the API as `{ error: { code, message, details? } }`. `message` is the
 * user-facing Spanish text from the backend; `code` is stable and safe to branch on.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Builds an ApiError from any response body, even if it is not in the expected shape. */
  static fromResponse(status: number, body: unknown): ApiError {
    const error = (body as { error?: unknown } | null)?.error;
    if (error && typeof error === 'object') {
      const { code, message, details } = error as Record<string, unknown>;
      if (typeof code === 'string' && typeof message === 'string') {
        return new ApiError(status, code, message, details);
      }
    }
    return new ApiError(status, status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN_ERROR', GENERIC_MESSAGE);
  }

  static network(): ApiError {
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'No pudimos conectarnos con la tienda. Revisá tu conexión y probá de nuevo.',
    );
  }

  /** Field errors of a VALIDATION_ERROR keyed by field name. */
  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const item of this.details as unknown[]) {
      const { field, message } = (item ?? {}) as Partial<FieldErrorDetail>;
      if (typeof field === 'string' && typeof message === 'string' && !(field in out)) {
        out[field] = message;
      }
    }
    return out;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** More helpful texts for some well-known codes; otherwise the backend message is used. */
const FRIENDLY: Record<string, string> = {
  PAYMENTS_NOT_CONFIGURED:
    'El pago online no está disponible en este momento. Probá de nuevo más tarde.',
  PAYMENT_PROVIDER_ERROR:
    'No pudimos iniciar el pago. Tu carrito se restauró: probá de nuevo en unos minutos.',
  RATE_LIMITED: 'Hiciste demasiados intentos seguidos. Esperá un rato y probá de nuevo.',
  ORIGIN_NOT_ALLOWED: 'No pudimos validar la solicitud. Recargá la página y probá de nuevo.',
};

export function errorMessage(error: unknown): string {
  if (isApiError(error)) return FRIENDLY[error.code] ?? error.message;
  return GENERIC_MESSAGE;
}
