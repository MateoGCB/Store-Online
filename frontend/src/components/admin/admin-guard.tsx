import { ShieldAlert } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ButtonLink } from '@/components/ui/button';
import { getSessionUser } from '@/lib/api/server';
import { AdminShell } from './admin-shell';

export const SESSION_COOKIE = 'session';

/**
 * Server-side role check for /admin. The role is never trusted from the browser: the
 * session cookie is forwarded to GET /auth/me. (The API also answers 403 to every admin
 * call from a non-admin; that is the real barrier.)
 */
export async function AdminGuard({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(session ? `${SESSION_COOKIE}=${session}` : undefined);
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') return <NoPermission />;
  return <AdminShell userName={user.name}>{children}</AdminShell>;
}

export function NoPermission() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center"
    >
      <ShieldAlert aria-hidden className="size-12 text-danger" />
      <h1 className="mt-4 font-display text-3xl text-ink">No tenés permisos</h1>
      <p className="mt-3 text-muted">
        Esta sección es solo para la administración de la tienda. Si creés que es un error, ingresá
        con otra cuenta.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Volver a la tienda</ButtonLink>
        <ButtonLink href="/login?next=/admin" variant="secondary">
          Ingresar con otra cuenta
        </ButtonLink>
      </div>
    </main>
  );
}
