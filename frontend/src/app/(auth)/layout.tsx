import { FocusHeader } from '@/components/shop/focus-header';
import { ShopFrame } from '@/components/shop/shop-frame';

/** /login and /register: reduced header with only the store name and a way back. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopFrame header={<FocusHeader backHref="/" backLabel="Volver a la tienda" />}>
      {children}
    </ShopFrame>
  );
}
