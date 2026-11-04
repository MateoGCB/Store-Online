import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function body(code: string, message: string, details?: unknown): ErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/** Maps any thrown error to the uniform `{ error: { code, message, details? } }` shape. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) {
    req.log?.error({ err }, 'error after headers were sent');
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(body('FILE_TOO_LARGE', 'La imagen supera el máximo de 5 MB.'));
      return;
    }
    res.status(400).json(body('INVALID_UPLOAD', 'Mandá una sola imagen en el campo "image".'));
    return;
  }

  // Errors raised by express.json() (body-parser)
  const type = (err as { type?: unknown }).type;
  if (type === 'entity.too.large') {
    res
      .status(413)
      .json(body('PAYLOAD_TOO_LARGE', 'El cuerpo de la solicitud es demasiado grande.'));
    return;
  }
  if (type === 'entity.parse.failed') {
    res.status(400).json(body('INVALID_JSON', 'El cuerpo de la solicitud no es un JSON válido.'));
    return;
  }
  // Other HTTP errors raised by Express middleware (e.g. serve-static 404 for /uploads)
  const status = (err as { status?: unknown }).status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    if (status === 404) {
      res.status(404).json(body('NOT_FOUND', 'No encontramos lo que buscás.'));
    } else {
      res.status(status).json(body('BAD_REQUEST', 'La solicitud no es válida.'));
    }
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json(body('CONFLICT', 'Ya existe un registro con esos datos.'));
    return;
  }

  req.log?.error({ err }, 'unhandled error');
  res
    .status(500)
    .json(body('INTERNAL_ERROR', 'Ocurrió un error inesperado. Probá de nuevo más tarde.'));
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body('ROUTE_NOT_FOUND', 'La ruta solicitada no existe.'));
};
