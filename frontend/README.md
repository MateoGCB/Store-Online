# Frontend de la tienda

Tienda y panel de administración en Next.js 16 (App Router, Cache Components), React 19, TypeScript estricto y Tailwind CSS 4. Cómo levantar todo el proyecto: ver el [README de la raíz](../README.md).

```bash
npm install
cp .env.example .env    # API_URL=http://localhost:4000 (la API tiene que estar levantada)
npm run dev             # http://localhost:3000
```

## Estructura

```
src/
  app/(shop)/      tienda con el encabezado completo: inicio, catálogo, producto, carrito,
                   cuenta, resultado del pago, pago simulado
  app/(auth)/      ingreso y registro, con encabezado reducido ("Volver a la tienda")
  app/(checkout)/  /checkout, con encabezado reducido ("Volver al carrito")
  app/admin/       panel (la guarda de rol corre en el servidor con GET /auth/me)
  components/      ui/ (botones, campos, diálogos, toasts…), shop/, account/, orders/, admin/
  hooks/           sesión, carrito, direcciones, pedidos, admin (TanStack Query)
  lib/api/         cliente HTTP único, errores (ApiError), tipos generados (schema.d.ts)
  lib/format/      dinero (centavos -> ARS) y fechas (UTC -> hora de Argentina)
  lib/orders/      etiquetas de estado y tabla única de transiciones
tests/             unidad y componentes (Vitest + Testing Library + MSW)
e2e/               Playwright (npm run e2e)
```

## Decisiones

- **Proxy:** el navegador llama a `/api/v1/...` y `/uploads/...` en el mismo origen; Next los reenvía a `API_URL`.
- **Diseño:** colores, tipografías, radios, sombras y animaciones viven solo en el bloque `@theme` de `src/app/globals.css`.
- **Imágenes:** `next/image` optimiza `/uploads/**` como imágenes locales (`localPatterns`), sin habilitar IPs privadas en el optimizador.
- **Tipos de la API:** `npm run api:types` los regenera desde la spec del backend (`../backend`, sin necesidad de levantarlo); `npm run api:types:check` falla si quedaron desactualizados.
- **Encabezados por grupo de rutas:** cada grupo (`(shop)`, `(auth)`, `(checkout)`) tiene su propio `layout.tsx`; los paréntesis no forman parte de la URL. Así las páginas de foco no muestran buscador, carrito ni menú de cuenta sin condicionales por ruta.
- **Dinero:** la API manda centavos enteros; el frontend solo los formatea. Los precios que carga el admin se convierten a centavos sin usar decimales de punto flotante.

## Calidad

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, `npm run e2e`.
