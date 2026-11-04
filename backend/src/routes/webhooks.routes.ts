import type { Router } from 'express';
import type { Deps } from '../deps.js';
import { AppError, badRequest } from '../lib/errors.js';
import { verifyWebhookSignature } from '../payments/webhook-signature.js';
import { handlePaymentNotification } from '../services/payments.service.js';

function firstString(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export function registerWebhookRoutes(router: Router, deps: Deps) {
  /**
   * Mercado Pago notifications. Authenticated by the `x-signature` HMAC (exempt from the
   * Origin/Content-Type checks). Errors return 500 so Mercado Pago retries.
   */
  router.post('/webhooks/mercadopago', async (req, res) => {
    const failure = verifyWebhookSignature({
      xSignature: req.headers['x-signature'],
      xRequestId: req.headers['x-request-id'],
      dataId: req.query['data.id'],
      secret: deps.env.MP_WEBHOOK_SECRET,
    });
    if (failure) {
      req.log?.warn({ reason: failure }, 'rejected webhook with invalid signature');
      throw new AppError(401, 'INVALID_SIGNATURE', 'La firma de la notificación no es válida.');
    }

    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<
      string,
      unknown
    >;
    const type =
      firstString(req.query.type) ?? firstString(req.query.topic) ?? firstString(body.type);
    if (type !== 'payment') {
      res.status(200).json({ received: true });
      return;
    }

    const paymentId = firstString(req.query['data.id']);
    if (!paymentId || !/^[A-Za-z0-9_-]{1,64}$/.test(paymentId)) {
      throw badRequest('INVALID_NOTIFICATION', 'La notificación no tiene un id de pago válido.');
    }
    const notificationId =
      typeof body.id === 'string' || typeof body.id === 'number' ? String(body.id) : undefined;
    const eventId =
      notificationId ?? `payment:${paymentId}:${firstString(req.headers['x-request-id']) ?? ''}`;

    const outcome = await handlePaymentNotification(deps, eventId, paymentId);
    req.log?.info({ outcome, paymentId }, 'payment notification processed');
    res.status(200).json({ received: true });
  });
}
