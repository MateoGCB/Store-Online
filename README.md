# Tienda online

Tienda online completa de objetos para el hogar y de diseño: catálogo con filtros y búsqueda, carrito, checkout con reserva de stock, pagos con Mercado Pago (o simulados en modo demo), seguimiento de pedidos y un panel de administración para productos, imágenes, stock, categorías, pedidos y configuración.

Monorepo con dos partes:

| Carpeta | Qué es | Puerto |
|---|---|---|
| `backend/` | API REST (Node + Express + PostgreSQL) | 4000 |
| `frontend/` | Tienda y panel de administración (Next.js) | 3000 |

## Stack

- **Backend:** Node.js + TypeScript estricto, Express 5, PostgreSQL 16 (Docker), Prisma 7, Zod, OpenAPI generada desde los esquemas (Swagger UI en `/docs`), sesión con cookie HttpOnly, argon2id, helmet, rate limit, multer + sharp, SDK oficial de Mercado Pago. Tests con Vitest + Supertest contra una base real `*_test`.
- **Frontend:** Next.js 16 (App Router, Cache Components) + React 19 + TypeScript estricto, Tailwind CSS 4 (todos los valores de diseño en `frontend/src/app/globals.css`), TanStack Query, React Hook Form + Zod, lucide-react, tipos de la API generados con `openapi-typescript`. Tests con Vitest + Testing Library + MSW y de punta a punta con Playwright (+ axe para accesibilidad).

## Cómo funciona (en corto)

- El navegador **siempre** llama a `localhost:3000/api/v1/...` y Next reenvía la llamada a la API (proxy con `rewrites`). Así la cookie de sesión vive en un solo origen y la protección CSRF de la API funciona sin CORS entre dominios. Las imágenes (`/uploads/...`) pasan por el mismo proxy.
- Inicio, catálogo y detalle de producto se arman en el servidor (rápidos y con buenos metadatos) y se cachean ~60 s / ~30 s. Carrito, checkout, pedidos y administración son interactivos en el navegador y nunca se cachean.
- La API es la autoridad: calcula precios, totales y stock (reserva atómica en la base) y valida roles. El frontend solo muestra y ayuda a validar.

## Requisitos

- Node.js 22.12 o superior (probado con Node 24)
- Docker Desktop (o Docker Engine con Compose)

## Cómo levantar todo

```bash
# 1. Base de datos (elegí tu propia contraseña en .env)
cp .env.example .env
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env      # completá DATABASE_URL (misma contraseña), JWT_SECRET y el admin
npm run db:deploy         # migraciones
npm run db:seed           # admin, configuración, 4 categorías y 20 productos con imágenes de ejemplo
npm run dev               # http://localhost:4000  (docs: http://localhost:4000/docs)

# 3. Frontend (en otra terminal)
cd frontend
npm install
cp .env.example .env      # API_URL=http://localhost:4000
npm run dev               # http://localhost:3000
```

**Credenciales del administrador de desarrollo:** son las que pusiste en `ADMIN_EMAIL` y `ADMIN_PASSWORD` de `backend/.env` antes de correr el seed. No están escritas en ningún lado del repo. El panel está en <http://localhost:3000/admin>.

Las imágenes de ejemplo del seed se generan por código (degradados con el nombre del producto, dos por producto). Desde el panel podés subir fotos reales (JPEG, PNG o WebP de hasta 5 MB; se reencodean y se les borran los metadatos).

### Modo demo (pagos simulados)

Para probar la tienda de punta a punta **sin credenciales de Mercado Pago y sin túnel**, levantá el backend con pagos simulados:

```bash
cd backend
PAYMENTS_PROVIDER=fake npm run dev      # en PowerShell: $env:PAYMENTS_PROVIDER='fake'; npm run dev
```

El checkout lleva a una página de la propia tienda (`/dev/simulated-payment`) con los botones "Simular pago aprobado" y "Simular pago rechazado". El pago simulado pasa por el mismo camino de confirmación que un webhook real de Mercado Pago. Esa página y su endpoint (`POST /api/v1/dev/orders/:id/simulate-payment`) **solo existen** con `PAYMENTS_PROVIDER=fake`, y la API **se niega a arrancar** con `fake` si `NODE_ENV=production`.

### Mercado Pago de prueba

> **Estado:** el flujo de pago está probado con un **proveedor falso** (tests automáticos y modo demo). La firma del webhook se verifica con el validador oficial del SDK. **La prueba real contra el sandbox de Mercado Pago todavía está pendiente.**

1. Creá una cuenta en el [panel de desarrolladores de Mercado Pago](https://www.mercadopago.com.ar/developers/panel) y una aplicación de Checkout Pro.
2. Creá usuarios de prueba (vendedor y comprador).
3. Copiá las credenciales de prueba y la clave secreta de webhooks **solo en `backend/.env`** (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`).
4. `npm run mp:smoke` (en `backend/`) crea una preferencia real de prueba e imprime el link.
5. Después de pagar, Mercado Pago vuelve a `/checkout/result`, que consulta el estado real del pago (`POST /orders/:id/sync`).
6. Para recibir webhooks en tu máquina hace falta un túnel HTTPS (ngrok, Cloudflare Tunnel…) configurado en `PUBLIC_API_URL` y en el panel. Sin túnel la API no manda `notification_url` y el pago se confirma con el `sync` de `/checkout/result`.

Sin `MP_ACCESS_TOKEN` (y sin modo demo), el checkout responde que el pago no está disponible.

## Variables de entorno

**Raíz (`.env`)**, solo para Docker: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

**Backend (`backend/.env`)**

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NODE_ENV` | no | `development` (por defecto), `test` o `production` |
| `PORT` | no | Puerto de la API (4000) |
| `DATABASE_URL` | sí | PostgreSQL de desarrollo |
| `DATABASE_URL_TEST` | para tests | Base de tests: **el nombre tiene que terminar en `_test`** |
| `JWT_SECRET` | sí | Mínimo 32 caracteres |
| `CORS_ORIGINS` | no | Orígenes permitidos (por defecto `http://localhost:3000`; nunca `*`) |
| `FRONTEND_URL` | no | URL de la tienda (vuelta desde Mercado Pago) |
| `PUBLIC_API_URL` | no | URL pública de la API (imágenes y webhook) |
| `RESERVATION_MINUTES` | no | Minutos de reserva de stock de un pedido sin pagar (30) |
| `UPLOAD_DIR` | no | Carpeta de imágenes subidas (`uploads`) |
| `TRUST_PROXY` | no | `false` o cantidad de proxies delante de la API. Detrás del proxy de la tienda, `1` (ver aviso abajo) |
| `PAYMENTS_PROVIDER` | no | `mercadopago` (por defecto) o `fake` (modo demo; prohibido en producción) |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | en producción | Credenciales de Mercado Pago |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | para el seed | Administrador que crea `npm run db:seed` |
| `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_CHECKOUT_MAX` | no | Límites por ventana |
| `LOG_LEVEL` | no | Nivel de log |

> **`TRUST_PROXY` y rate limit.** La tienda reenvía todas las llamadas a la API desde su servidor, así que, para la API, todos los visitantes llegan desde la misma dirección. Con `TRUST_PROXY=1` la API toma la IP real del encabezado `X-Forwarded-For` que agrega el proxy y cada visitante tiene su propio límite de intentos (login, registro, checkout). Con `false`, ese encabezado se ignora y todos comparten el límite. **Con `TRUST_PROXY=1` la API NO debe quedar expuesta directamente a internet, solo detrás del proxy**: si cualquiera pudiera llamarla directo, podría inventar un `X-Forwarded-For` distinto en cada intento y esquivar el rate limit.

**Frontend (`frontend/.env`)**: solo `API_URL` (la usa el servidor de Next; el navegador nunca la ve). El frontend no necesita ninguna credencial.

## Scripts y tests

| Dónde | Comando | Qué hace |
|---|---|---|
| backend | `npm run dev` / `build` / `start` | Desarrollo / compilar / producción |
| backend | `npm run typecheck`, `lint`, `format:check` | Calidad |
| backend | `npm test` | Tests de integración (base `*_test`, se crea y migra sola) |
| backend | `npm run db:migrate` / `db:deploy` / `db:seed` | Base de datos |
| backend | `npm run openapi:export` | Imprime la spec OpenAPI (la usa el frontend para sus tipos) |
| frontend | `npm run dev` / `build` / `start` | Desarrollo / build / producción |
| frontend | `npm run typecheck`, `lint`, `format:check` | Calidad |
| frontend | `npm test` | Tests de unidad y de componentes (Vitest + Testing Library + MSW) |
| frontend | `npm run api:types` / `api:types:check` | Regenera / verifica los tipos de la API |
| frontend | `npm run e2e` | Pruebas de punta a punta (ver abajo) |

`npm run e2e` (con Docker levantado) crea desde cero una base **dedicada** `store_e2e_test` (aborta si el nombre no termina en `_test`), la migra y la siembra, compila la tienda y corre Playwright. Playwright levanta la API en modo demo y la tienda en puertos propios (4100 y 3100). Nunca toca la base de desarrollo. Cubre: navegar/filtrar/buscar, compra con retiro y con envío, dos compras simultáneas del último producto, acceso a `/admin`, alta de producto con imagen, cambio de estado de un pedido, cancelación que libera stock, accesibilidad (axe, WCAG 2.1 AA), 375 px y teclado.

## Estado y límites conocidos

Hecho: la API completa y la tienda con su panel de administración, con tests de backend, de componentes y de punta a punta.

- **Carrito solo con cuenta:** no hay carrito de invitado; al tocar "Agregar al carrito" sin sesión se pide ingresar.
- **Reembolsos manuales:** un pedido pagado que se cancela, o un pago que llega tarde sin stock, queda marcado "necesita atención" para reembolsarlo a mano.
- **Sin emails** (confirmación, cambios de estado, recuperar contraseña).
- **Prueba real del pago pendiente** contra el sandbox de Mercado Pago (ver arriba): el flujo está probado solo con el proveedor falso.
- **Producto inexistente:** `/products/<slug-que-no-existe>` muestra la página "no encontrada" pero responde HTTP 200 (con `noindex`, así los buscadores no la indexan). Con el *streaming* de Next, el status ya se envió cuando se sabe que el producto no existe. Las páginas de modo demo (`/dev/...`) sí responden 404 real porque se chequean antes de renderizar.
- **401 en la consola para visitantes sin sesión:** la tienda pregunta `GET /api/v1/auth/me` y, sin sesión, la API responde 401; el navegador lo muestra como "Failed to load resource". Es esperado y no afecta el funcionamiento.
- **Historial de estados:** los pedidos guardan solo las fechas de creación, pago y cancelación, no cada cambio de estado.
- **`npm audit`:** reporta vulnerabilidades moderadas en `minimatch`, dentro de las herramientas de ESLint (solo desarrollo, no llegan a producción). La "solución" automática degrada versiones de ESLint.
- Sesiones JWT sin estado: el logout borra la cookie, pero un token copiado vale hasta que vence (12 h).
- Imágenes en disco local (falta almacenamiento en la nube) y rate limit en memoria (una sola instancia).
