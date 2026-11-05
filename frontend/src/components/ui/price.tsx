import { formatCents } from '@/lib/format/money';

export function Price({ cents, className = '' }: { cents: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatCents(cents)}</span>;
}
