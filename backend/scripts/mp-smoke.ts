/**
 * Manual smoke check (not a test): creates a real Mercado Pago TEST preference with the
 * credentials from .env and prints it. Skips with a clear message when there are none.
 * Usage: npm run mp:smoke
 */
import { randomUUID } from 'node:crypto';
import { loadEnv } from '../src/config/env.js';
import { MercadoPagoProvider } from '../src/payments/mercadopago.provider.js';

const env = loadEnv();

if (!env.MP_ACCESS_TOKEN) {
  console.warn(
    'mp:smoke salteado: no hay MP_ACCESS_TOKEN en backend/.env. Cargá las credenciales de prueba de tu aplicación de Mercado Pago para probar.',
  );
  process.exit(0);
}

const provider = new MercadoPagoProvider(env.MP_ACCESS_TOKEN);
const orderId = randomUUID();

try {
  const preference = await provider.createPreference({
    orderId,
    orderNumber: 0,
    payerEmail: 'comprador.de.prueba@example.com',
    expiresAt: new Date(Date.now() + 30 * 60_000),
    notificationUrl: `${env.PUBLIC_API_URL.replace(/\/+$/, '')}/api/v1/webhooks/mercadopago`,
    backUrls: {
      success: `${env.FRONTEND_URL}/checkout/result?orderId=${orderId}&payment=success`,
      pending: `${env.FRONTEND_URL}/checkout/result?orderId=${orderId}&payment=pending`,
      failure: `${env.FRONTEND_URL}/checkout/result?orderId=${orderId}&payment=failure`,
    },
    items: [{ id: 'smoke', title: 'Producto de prueba', quantity: 1, unitPriceCents: 100_00 }],
  });
  console.log('Preferencia de prueba creada:');
  console.log(`  external_reference: ${orderId}`);
  console.log(`  preference id:      ${preference.preferenceId}`);
  console.log(`  checkout URL:       ${preference.checkoutUrl}`);
} catch (err) {
  console.error('No se pudo crear la preferencia de prueba:');
  console.error(err);
  process.exitCode = 1;
}
