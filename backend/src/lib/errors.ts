/**
 * Typed application error. Services throw these; the error handler turns them into
 * `{ error: { code, message, details? } }` responses. `message` is user-facing (Spanish),
 * `code` is a stable English identifier clients can rely on.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);

export const unauthenticated = () =>
  new AppError(401, 'UNAUTHENTICATED', 'Tenés que iniciar sesión para continuar.');

export const forbidden = () => new AppError(403, 'FORBIDDEN', 'No tenés permiso para hacer esto.');

export const notFound = (code: string, message: string) => new AppError(404, code, message);

export const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details);
