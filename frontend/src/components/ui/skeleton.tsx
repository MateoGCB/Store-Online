export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-control bg-ink/7 motion-reduce:animate-none ${className}`}
    />
  );
}

/** Accessible wrapper for a loading region. */
export function LoadingRegion({
  label = 'Cargando…',
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
