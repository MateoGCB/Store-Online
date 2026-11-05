import { FocusHeader } from '@/components/shop/focus-header';
import { ShopFrame } from '@/components/shop/shop-frame';

/**
 * /checkout only: reduced header with a way back to the cart. /checkout/result lives in
 * the (shop) group and keeps the full header.
 */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopFrame header={<FocusHeader backHref="/cart" backLabel="Volver al carrito" />}>
      {children}
    </ShopFrame>
  );
}
