import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { vi } from 'vitest';
import AuthLayout from '@/app/(auth)/layout';
import CheckoutLayout from '@/app/(checkout)/layout';
import ShopLayout from '@/app/(shop)/layout';
import { renderWithProviders } from '../support/render';
import { API, server } from '../support/server';

// The store name is an async Server Component (GET /store-info); here a plain stand-in.
vi.mock('@/components/shop/store-name', () => ({
  StoreName: () => 'TIENDA',
  PickupAddress: () => 'Av. Siempreviva 742',
}));
// next/form needs the Next router; a plain GET form behaves the same for these checks.
vi.mock('next/form', () => ({
  default: ({ action, ...props }: React.ComponentProps<'form'> & { action: string }) => (
    <form action={action} {...props} />
  ),
}));

beforeEach(() => {
  server.use(
    http.get(`${API}/auth/me`, () =>
      HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Ingresá.' } }, { status: 401 }),
    ),
  );
});

function banner() {
  return within(screen.getByRole('banner'));
}

describe('reduced header on focus pages', () => {
  it('/login and /register: only the store name and "Volver a la tienda"', () => {
    renderWithProviders(<AuthLayout>Formulario</AuthLayout>);
    const header = banner();
    expect(header.getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual(
      [
        ['TIENDA', '/'],
        ['Volver a la tienda', '/'],
      ],
    );
    expect(header.queryByRole('search')).not.toBeInTheDocument();
    expect(header.queryByRole('link', { name: /carrito/i })).not.toBeInTheDocument();
    expect(header.queryByText('Ingresar')).not.toBeInTheDocument();
    expect(header.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Formulario');
  });

  it('/checkout: only the store name and "Volver al carrito"', () => {
    renderWithProviders(<CheckoutLayout>Pago</CheckoutLayout>);
    const header = banner();
    expect(header.getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual(
      [
        ['TIENDA', '/'],
        ['Volver al carrito', '/cart'],
      ],
    );
    expect(header.queryByRole('search')).not.toBeInTheDocument();
    expect(header.queryByRole('button')).not.toBeInTheDocument();
    expect(header.queryByText('Ingresar')).not.toBeInTheDocument();
  });

  it('the other public pages keep the full header (search, cart and account)', async () => {
    renderWithProviders(<ShopLayout>Catálogo</ShopLayout>);
    const header = banner();
    expect(header.getByRole('search')).toBeInTheDocument();
    expect(header.getByRole('link', { name: 'Carrito, vacío' })).toHaveAttribute('href', '/cart');
    expect(await header.findByRole('link', { name: 'Ingresar' })).toBeInTheDocument();
    expect(header.queryByText('Volver a la tienda')).not.toBeInTheDocument();
  });

  it('every layout keeps the skip link, a single main region and the footer', () => {
    for (const Layout of [AuthLayout, CheckoutLayout, ShopLayout]) {
      const { unmount } = renderWithProviders(<Layout>Contenido</Layout>);
      expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
        'href',
        '#main',
      );
      expect(screen.getAllByRole('main')).toHaveLength(1);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      unmount();
    }
  });
});

/** URL -> route group of every page under src/app, read from the file system. */
function routeGroups(): Record<string, string> {
  const app = path.resolve(__dirname, '../../src/app');
  const result: Record<string, string> = {};
  for (const entry of readdirSync(app, { recursive: true, withFileTypes: true })) {
    if (entry.name !== 'page.tsx') continue;
    const segments = path.relative(app, entry.parentPath).split(path.sep).filter(Boolean);
    const group = segments.find((s) => /^\(.+\)$/.test(s)) ?? '(none)';
    const url = `/${segments.filter((s) => !/^\(.+\)$/.test(s)).join('/')}`;
    result[url] = group;
  }
  return result;
}

describe('route groups decide which header a page gets', () => {
  it('only /login, /register and /checkout are focus pages; /checkout/result is not', () => {
    const groups = routeGroups();
    const focus = Object.entries(groups).filter(([, g]) => g === '(auth)' || g === '(checkout)');
    expect(Object.fromEntries(focus)).toEqual({
      '/login': '(auth)',
      '/register': '(auth)',
      '/checkout': '(checkout)',
    });
    expect(groups['/checkout/result']).toBe('(shop)');
    for (const url of ['/', '/products', '/products/[slug]', '/cart', '/account/orders']) {
      expect(groups[url]).toBe('(shop)');
    }
  });
});
