import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/api/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '@/lib/orders/status';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_STATUS_TONES[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
