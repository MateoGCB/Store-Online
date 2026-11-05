'use client';

import {
  ChevronDown,
  LogOut,
  Package,
  MapPin,
  LayoutDashboard,
  ShoppingBag,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useCart } from '@/hooks/use-cart';
import { useLogout, useSession } from '@/hooks/use-session';
import { loginUrl } from '@/lib/auth/next-param';

function CartLink() {
  const { user } = useSession();
  const { data } = useCart();
  const count = user ? (data?.itemCount ?? 0) : 0;
  const label =
    count === 0 ? 'Carrito, vacío' : `Carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`;
  return (
    <Link
      href="/cart"
      aria-label={label}
      className="relative inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5"
    >
      <ShoppingBag aria-hidden className="size-5" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute top-1 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] leading-5 font-semibold text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function AccountMenu() {
  const { user, isLoading, isAdmin } = useSession();
  const logout = useLogout();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (isLoading) return <Skeleton className="h-9 w-24 rounded-full" />;

  if (!user) {
    return (
      <Link
        href={loginUrl(pathname)}
        className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink hover:bg-ink/5"
      >
        <User aria-hidden className="size-4" />
        Ingresar
      </Link>
    );
  }

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm text-ink hover:bg-canvas';

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 max-w-44 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink hover:bg-ink/5"
      >
        <User aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{user.name.split(' ')[0]}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
        <span className="sr-only">: menú de tu cuenta</span>
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-40 mt-2 w-60 animate-fade-in rounded-card border border-line bg-surface p-2 shadow-lift"
        >
          <p className="truncate px-3 pt-1 pb-2 text-xs text-muted">{user.email}</p>
          <ul className="space-y-0.5" onClick={() => setOpen(false)}>
            <li>
              <Link href="/account/orders" className={itemClass}>
                <Package aria-hidden className="size-4" /> Mis pedidos
              </Link>
            </li>
            <li>
              <Link href="/account/addresses" className={itemClass}>
                <MapPin aria-hidden className="size-4" /> Mis direcciones
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link href="/admin" className={itemClass}>
                  <LayoutDashboard aria-hidden className="size-4" /> Panel de administración
                </Link>
              </li>
            )}
            <li className="mt-1 border-t border-line pt-1">
              <button
                type="button"
                className={itemClass}
                onClick={() =>
                  logout.mutate(undefined, {
                    onSuccess: () => {
                      toast.show('Cerraste sesión.', 'info');
                      router.push('/');
                      router.refresh();
                    },
                  })
                }
              >
                <LogOut aria-hidden className="size-4" /> Cerrar sesión
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export function HeaderActions() {
  return (
    <div className="flex items-center gap-1">
      <AccountMenu />
      <CartLink />
    </div>
  );
}
