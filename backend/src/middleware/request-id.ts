import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

/**
 * Reuses a well-formed incoming `X-Request-Id` (e.g. from a proxy) or creates one,
 * and echoes it back in the response so logs and client reports can be correlated.
 */
export function genRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}
