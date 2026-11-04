# Tienda online

Backend de una tienda online chica: catálogo, carrito, checkout con reserva de stock, pagos con Mercado Pago (modo prueba), pedidos con máquina de estados y panel de administración vía API.

El frontend (Next.js) todavía no está hecho: va a vivir en `frontend/`.

## Stack

- **Node.js + TypeScript** (modo estricto) con **Express 5**
- **PostgreSQL 16** (Docker) con **Prisma 7** (migraciones versionadas en `backend/prisma/migrations`)
- **Zod** para validar entradas y generar la documentación **OpenAPI** (Swagger UI en `/docs`)
- Sesión con **cookie HttpOnly** (JWT firmado con `jose`), contraseñas con **argon2id**
- **helmet**, **cors**, **express-rate-limit**, logs con **pino**
- Imágenes con **multer + sharp** (se reencodean a WebP sin metadatos)
- SDK oficial **mercadopago**
- Tests con **Vitest + Supertest** contra una base PostgreSQL real (`store_test`)

## Estructura

```
docker-compose.yml        PostgreSQL 16 (puerto 5433 en tu máquina)
backend/
  prisma/                 schema.prisma, migraciones y seed
  src/
    config/env.ts         variables de entorno validadas al arrancar
    app.ts / server.ts    armado de la app Express / arranque + job de vencimientos
    routes/               solo HTTP: validan con Zod y llaman a services
    services/             lógica de negocio (no conocen req/res)
    middleware/           auth, CSRF (Origin), rate limit, errores, request id
    payments/             interfaz PaymentProvider + Mercado Pago real + falso para tests
    storage/              interfaz StorageProvider + disco local
    lib/                  reloj inyectable, dinero, slugs, errores
    openapi/              spec OpenAPI generada desde los schemas
  tests/                  tests de integración
```

## Requisitos

- Node.js 20.19 o superior (probado con Node 24)
- Docker Desktop (o Docker Engine con Compose)

## Cómo levantarlo

```bash
# 1. Credenciales de la base local (elegí tu propia contraseña)
cp .env.example .env

# 2. Base de datos
docker compose up -d

# 3. Backend
cd backend
npm install
cp .env.example .env      # completá DATABASE_URL con la misma contraseña, JWT_SECRET y el admin
npm run db:deploy         # aplica las migraciones
npm run db:seed           # admin, configuración, 4 categorías y 20 productos de ejemplo
npm run dev               # http://localhost:4000
```

- Estado: <http://localhost:4000/api/v1/health>
- Documentación interactiva: <http://localhost:4000/docs>

Para crear migraciones nuevas durante el desarrollo: `npm run db:migrate`.

## Variables de entorno (`backend/.env`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NODE_ENV` | no | `development` (por defecto), `test` o `production` |
| `PORT` | no | Puerto de la API (por defecto 4000) |
| `DATABASE_URL` | sí | Conexión a PostgreSQL de desarrollo |
| `DATABASE_URL_TEST` | para tests | Base de tests: **su nombre tiene que terminar en `_test`** |
| `JWT_SECRET` | sí | Mínimo 32 caracteres. Generalo con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `CORS_ORIGINS` | no | Orígenes permitidos separados por coma (por defecto `http://localhost:3000`; nunca `*`) |
| `FRONTEND_URL` | no | URL del frontend (para volver desde Mercado Pago) |
| `PUBLIC_API_URL` | no | URL pública de esta API (URLs de imágenes y webhook) |
| `RESERVATION_MINUTES` | no | Minutos que se reserva el stock de un pedido sin pagar (por defecto 30) |
| `UPLOAD_DIR` | no | Carpeta de imágenes subidas (por defecto `uploads`) |
| `TRUST_PROXY` | no | `false` o la cantidad de proxies delante de la API |
| `MP_ACCESS_TOKEN` | en producción | Access token de prueba de Mercado Pago |
| `MP_WEBHOOK_SECRET` | en producción | Clave secreta de webhooks de Mercado Pago |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | para el seed | Usuario administrador que crea `npm run db:seed` |
| `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_CHECKOUT_MAX` | no | Límites por ventana (por defecto 10 por 15 min, 5 por hora, 10 por minuto) |
| `LOG_LEVEL` | no | Nivel de log de pino |

El `.env` de la raíz solo tiene `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` para `docker-compose.yml`. Ningún `.env` se sube al repo.

## Tests

Con la base levantada (`docker compose up -d`):

```bash
cd backend
npm run typecheck
npm run lint
npm test
npm run build
```

Los tests usan la base de `DATABASE_URL_TEST` (se crea y migra sola) y **abortan si su nombre no termina en `_test`**, para no tocar nunca la base de desarrollo. Cubren auth, aislamiento entre clientes, catálogo, carrito, checkout con 20 compras simultáneas, vencimientos con reloj inyectado, webhooks firmados, administración, máquina de estados, seguridad (CORS, Origin, helmet, 413) y que todas las rutas estén documentadas.

## Mercado Pago (modo prueba)

> **Estado de la integración:** todo el flujo de pago (preferencia, webhook firmado, consulta del pago, pagos tardíos, `sync`) está probado con tests automáticos usando un **proveedor de pagos falso** (`src/payments/fake.provider.ts`). La firma del webhook se verifica con el validador oficial del SDK. **La prueba real contra el sandbox de Mercado Pago (credenciales de prueba y un pago con usuario comprador de prueba) todavía está pendiente.**

1. Creá una cuenta en el [panel de desarrolladores de Mercado Pago](https://www.mercadopago.com.ar/developers/panel) y una aplicación de tipo Checkout Pro.
2. En **Cuentas de prueba** creá un usuario vendedor y uno comprador.
3. Copiá las **credenciales de prueba** (access token) y, en **Webhooks**, configurá la URL de notificaciones y copiá la **clave secreta**.
4. Ponelas **solo en `backend/.env`** (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`). Nunca en el código ni en el repo.
5. `npm run mp:smoke` crea una preferencia real de prueba e imprime el link (sin credenciales se saltea con un aviso).

**Webhooks en local:** Mercado Pago necesita una URL pública HTTPS para avisar los pagos. Para recibirlos en tu máquina hace falta un túnel (por ejemplo ngrok o Cloudflare Tunnel) y poner esa URL en `PUBLIC_API_URL` y en el panel de webhooks. **Sin túnel** la API no manda `notification_url` y el pago se confirma llamando a `POST /api/v1/orders/:id/sync` (el frontend lo hace al volver de Mercado Pago).

Sin `MP_ACCESS_TOKEN`, en desarrollo la API arranca igual y el checkout responde `503 PAYMENTS_NOT_CONFIGURED`.

## Cómo usar la API desde un cliente

- Prefijo `/api/v1`. Dinero en **centavos enteros** (ARS), fechas en UTC ISO 8601, IDs UUID.
- La sesión viaja en la cookie `session` (usá `credentials: 'include'` en `fetch`).
- Todo `POST`/`PUT`/`PATCH`/`DELETE` tiene que mandar `Content-Type: application/json` (salvo la subida de imágenes, que es `multipart/form-data`) y un `Origin` permitido. Es la protección contra CSRF.
- Errores: `{ "error": { "code": "...", "message": "...", "details": ... } }`. El `code` es estable; el `message` está pensado para mostrarlo al usuario.
- `POST /checkout` acepta el header `Idempotency-Key` para que un doble clic no cree dos pedidos.

## Estado y próximos pasos

Hecho: todo el backend descrito arriba, con tests.

Pendiente:

- **Frontend** con Next.js (`frontend/`).
- **Reembolsos automáticos** por la API de Mercado Pago: hoy un pedido pagado que se cancela (o un pago tardío sin stock) queda marcado con `needsAttention` para reembolsarlo a mano.
- **Emails** (confirmación de compra, cambios de estado, recuperar contraseña).
- **Cierre de sesión en todos los dispositivos**: las sesiones son JWT sin estado; el logout borra la cookie pero un token copiado sigue valiendo hasta que vence (12 h).
- **Almacenamiento de imágenes en la nube** (S3 o similar) detrás de `StorageProvider`; hoy se guardan en disco.
- **Rate limit distribuido** (Redis) si se corre más de una instancia; hoy los contadores están en memoria.
- **Prueba real contra el sandbox de Mercado Pago**: el flujo de pago está probado solo con un proveedor falso. Falta correr `npm run mp:smoke` con credenciales de prueba y hacer un pago completo con un usuario comprador de prueba (incluido el webhook a través de un túnel).
