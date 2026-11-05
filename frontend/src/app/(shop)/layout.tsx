import { ShopFrame } from '@/components/shop/shop-frame';
import { SiteHeader } from '@/components/shop/site-header';

/** Full header (search, cart, account) for every public page outside the focus groups. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopFrame header={<SiteHeader />}>{children}</ShopFrame>;
}
