import { Price } from '@/components/ui/price';
import type { Order } from '@/lib/api/types';

/** Items and server-computed totals of an order. */
export function OrderItems({
  order,
}: {
  order: Pick<Order, 'items' | 'subtotalCents' | 'shippingCents' | 'totalCents'>;
}) {
  return (
    <div className="rounded-card border border-line bg-surface">
      <ul className="divide-y divide-line">
        {order.items.map((item, i) => (
          <li
            key={`${item.productId ?? 'x'}-${i}`}
            className="flex justify-between gap-4 px-5 py-3 text-sm"
          >
            <span className="text-ink">
              {item.quantity} × {item.name}
              <span className="block text-xs text-muted">
                <Price cents={item.unitPriceCents} /> c/u
              </span>
            </span>
            <Price cents={item.lineTotalCents} className="text-ink" />
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>
            <Price cents={order.subtotalCents} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Envío</dt>
          <dd>{order.shippingCents === 0 ? 'Sin cargo' : <Price cents={order.shippingCents} />}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold text-ink">
          <dt>Total</dt>
          <dd>
            <Price cents={order.totalCents} />
          </dd>
        </div>
      </dl>
    </div>
  );
}
