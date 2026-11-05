import { ApiError, errorMessage } from '@/lib/api/errors';
import { formatDateTime, formatTime } from '@/lib/format/dates';

describe('ApiError', () => {
  it('parses the uniform error body', () => {
    const err = ApiError.fromResponse(409, {
      error: {
        code: 'INSUFFICIENT_STOCK',
        message: 'Solo hay 2 unidades disponibles.',
        details: { productId: 'p1', available: 2 },
      },
    });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('INSUFFICIENT_STOCK');
    expect(err.message).toBe('Solo hay 2 unidades disponibles.');
    expect(err.details).toEqual({ productId: 'p1', available: 2 });
  });

  it('turns VALIDATION_ERROR details into field errors (first message per field)', () => {
    const err = ApiError.fromResponse(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisá los datos enviados.',
        details: [
          { field: 'email', message: 'Ingresá un email válido.' },
          { field: 'email', message: 'Otro error.' },
          { field: 'name', message: 'Este campo es obligatorio.' },
        ],
      },
    });
    expect(err.fieldErrors()).toEqual({
      email: 'Ingresá un email válido.',
      name: 'Este campo es obligatorio.',
    });
  });

  it('falls back to a generic error for unexpected bodies', () => {
    const err = ApiError.fromResponse(502, '<html>Bad gateway</html>');
    expect(err.code).toBe('SERVER_ERROR');
    expect(err.message).toMatch(/error inesperado/);
    expect(ApiError.fromResponse(418, null).code).toBe('UNKNOWN_ERROR');
    expect(err.fieldErrors()).toEqual({});
  });

  it('shows friendlier texts for some known codes', () => {
    expect(errorMessage(new ApiError(503, 'PAYMENTS_NOT_CONFIGURED', 'x'))).toMatch(
      /pago online no está disponible/,
    );
    expect(errorMessage(new ApiError(409, 'CART_EMPTY', 'Tu carrito está vacío.'))).toBe(
      'Tu carrito está vacío.',
    );
    expect(errorMessage(new Error('boom'))).toMatch(/error inesperado/);
  });
});

describe('dates in Argentina time', () => {
  it('converts UTC to local time (UTC-3)', () => {
    expect(formatTime('2026-11-04T18:30:00.000Z')).toBe('15:30');
    // 01:15 UTC on the 5th is still the 4th in Buenos Aires.
    expect(formatDateTime('2026-11-05T01:15:00.000Z')).toBe('4 de nov de 2026, 22:15');
    expect(formatTime('not a date')).toBe('');
  });
});
