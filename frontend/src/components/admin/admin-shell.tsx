'use client';

import { FolderTree, LayoutDashboard, Package, Settings, ShoppingCart, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoreInfo } from '@/hooks/use-orders';

const NAV = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin/products', label: 'Productos', icon: Package },
  { href: '/admin/categories', label: 'Categorías', icon: FolderTree },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Same query as the settings page: saving a new store name updates this title at once.
  const storeInfo = useStoreInfo();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <div className="min-w-0">
            {storeInfo.isPending ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <p className="truncate font-display text-lg text-ink">
                {storeInfo.data?.storeName || 'Tienda'}
              </p>
            )}
            <p className="text-sm text-muted">Administración</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-ink/5 hover:text-ink lg:mt-3 lg:-ml-3"
          >
            <Store aria-hidden className="size-4" /> Ver tienda
          </Link>
        </div>
        <nav aria-label="Administración" className="overflow-x-auto px-2 pb-2 lg:px-3">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-control px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                      active ? 'bg-ink text-canvas' : 'text-ink hover:bg-ink/5'
                    }`}
                  >
                    <Icon aria-hidden className="size-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main id="main" tabIndex={-1} className="min-w-0 px-4 py-8 sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}
