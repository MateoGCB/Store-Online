import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { LoginForm, RegisterForm } from '@/components/account/auth-forms';
import { customer } from '../support/fixtures';
import { navigation } from '../support/next-mocks';
import { renderWithProviders } from '../support/render';
import { API, server } from '../support/server';

describe('LoginForm', () => {
  it('shows field errors linked to each input when submitting empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    const email = screen.getByLabelText('Email');
    expect(await screen.findByText('Ingresá tu email.')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Ingresá tu email.');
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      'Ingresá tu contraseña.',
    );
  });

  it('shows a generic message on 401 and does not navigate', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'El email o la contraseña no son correctos.',
            },
          },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta1');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El email o la contraseña no son correctos.',
    );
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it('goes back to a safe internal "next" after logging in', async () => {
    navigation.search = 'next=%2Fcart';
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json({ user: customer })));
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith('/cart'));
  });

  it('ignores an external "next" (open redirect)', async () => {
    navigation.search = 'next=https%3A%2F%2Fevil.com';
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json({ user: customer })));
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith('/'));
  });
});

describe('RegisterForm', () => {
  it('validates the password in bytes before sending', async () => {
    let calls = 0;
    server.use(
      http.post(`${API}/auth/register`, () => {
        calls++;
        return HttpResponse.json({ user: customer }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'á'.repeat(39) + '1');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText(/máximo 72 bytes/)).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('shows the 409 for an existing email on the email field', async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          { error: { code: 'EMAIL_TAKEN', message: 'Ya existe una cuenta con ese email.' } },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(email).toHaveAccessibleDescription(
      'Ya existe una cuenta con ese email. Probá ingresar.',
    );
  });

  it('sends the normalized data and navigates after creating the account', async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ user: customer }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByLabelText('Nombre'), '  Ana Pérez ');
    await user.type(screen.getByLabelText('Email'), ' ana@example.com ');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith('/'));
    expect(body).toEqual({ name: 'Ana Pérez', email: 'ana@example.com', password: 'secreta123' });
  });
});
