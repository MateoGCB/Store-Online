import { AlertTriangle, PackageOpen } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <PackageOpen aria-hidden className="mb-4 size-10 text-subtle" />
      <p className="font-display text-xl text-ink">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Algo salió mal',
  description = 'No pudimos cargar esta información. Probá de nuevo en unos segundos.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-card border border-danger/25 bg-danger-soft/60 px-6 py-12 text-center"
    >
      <AlertTriangle aria-hidden className="mb-3 size-9 text-danger" />
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Inline error message for forms (announced by screen readers). */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-control border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
