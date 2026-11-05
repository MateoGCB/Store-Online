import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <Loader2 aria-hidden className={`animate-spin motion-reduce:animate-none ${className}`} />;
}
