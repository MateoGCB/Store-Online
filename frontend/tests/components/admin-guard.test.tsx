import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { vi } from 'vitest';
import { AdminGuard } from '@/components/admin/admin-guard';
import { admin, customer } from '../support/fixtures';
import { navigation } from '../support/next-mocks';
import { server } from '../support/server';

const headers = vi.hoisted(() => ({ session: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'session' && headers.session ? { name, value: headers.session } : undefined,
  }),
}));

const BACKEND = 'http://localhost:4000/api/v1';

describe('AdminGuard (server-side role check)', () => {
  beforeEach(() => {
    navigation.pathname = '/admin';
  });

  it('without a session redirects to /login?next=/admin', async () => {
    headers.session = undefined;
    await expect(AdminGuard({ children: <p>Panel secreto</p> })).rejects.toThrow(
      'NEXT_REDIRECT /login?next=/admin',
    );
    expect(navigation.redirect).toHaveBeenCalledWith('/login?next=/admin');
  });

  it('a customer sees "No tenés permisos" and nothing of the panel', async () => {
    headers.session = 'customer-token';
    let cookie: string | null = null;
    server.use(
      http.get(`${BACKEND}/auth/me`, ({ request }) => {
        cookie = request.headers.get('cookie');
        return HttpResponse.json({ user: customer });
      }),
    );
    render(await AdminGuard({ children: <p>Panel secreto</p> }));
    expect(screen.getByRole('heading', { name: 'No tenés permisos' })).toBeInTheDocument();
    expect(screen.queryByText('Panel secreto')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Administración' })).not.toBeInTheDocument();
    expect(cookie).toBe('session=customer-token');
  });

  it('an admin sees the panel', async () => {
    headers.session = 'admin-token';
    server.use(http.get(`${BACKEND}/auth/me`, () => HttpResponse.json({ user: admin })));
    render(await AdminGuard({ children: <p>Panel secreto</p> }));
    expect(screen.getByText('Panel secreto')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Administración' })).toBeInTheDocument();
  });
});
